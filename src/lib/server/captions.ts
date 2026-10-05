import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MAX_CAPTION_LENGTH, type Clip, type ProductInfo } from "@/lib/clips";
import { runFfmpeg } from "./ffmpeg";
import { mediaPath } from "./storage";

const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `당신은 온라인 수산물 판매자를 돕는 한국어 광고 카피라이터입니다.
판매자가 직접 찍은 대게 영상으로 틱톡·유튜브 쇼츠·인스타그램 릴스용 세로 광고를 만들고 있습니다.
각 클립에서 뽑은 장면 이미지와 상품 정보를 보고, 클립마다 화면에 띄울 자막을 한 개씩 써 주세요.

고객: 요리를 자주 하는 30~40대 주부. 믿을 수 있는 산지 직송 수산물을 찾습니다.

자막 규칙:
- 한 자막은 1~2줄, 한 줄은 공백 포함 14자 이내. 줄을 나눌 때는 줄바꿈 문자(\\n)를 넣습니다.
- 자막은 그 클립의 장면 내용과 어울려야 합니다. 클립 순서대로 이어 읽으면 하나의 짧은 광고 흐름(관심 끌기 → 상품 장점 → 구매 유도)이 되게 합니다.
- 상품 정보에 없는 사실(가격, 무게, 산지, 수상 경력, 인증 등)은 지어내지 않습니다. 정보가 비어 있으면 그 내용은 쓰지 않습니다.
- "최고", "100%", "무조건", "세계 최초"처럼 확인할 수 없는 과장 표현은 쓰지 않습니다.
- 친근하고 믿음이 가는 말투. 이모지와 해시태그는 쓰지 않습니다.
- 전화번호나 주문 방법은 쓰지 않습니다. 영상 끝에 전화 주문 화면이 따로 붙습니다.`;

const CaptionsSchema = z.object({
  captions: z.array(z.string()),
});

export class CaptionConfigError extends Error {}

function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** 클립 구간의 가운데 장면을 가로 512px JPEG로 뽑아 base64로 돌려준다 */
async function extractFrame(clip: Clip) {
  const file = mediaPath(clip.mediaId);
  if (!file) throw new Error(`잘못된 미디어 ID: ${clip.mediaId}`);
  const at = clip.kind === "video" ? (clip.start + clip.end) / 2 : 0;
  const { code, stdout } = await runFfmpeg([
    "-loglevel",
    "error",
    ...(clip.kind === "video" ? ["-ss", at.toFixed(2)] : []),
    "-i",
    file,
    "-frames:v",
    "1",
    "-vf",
    "scale=512:-2",
    "-f",
    "image2",
    "-c:v",
    "mjpeg",
    "-q:v",
    "5",
    "pipe:1",
  ]);
  if (code !== 0 || stdout.length === 0) throw new Error("장면 이미지를 뽑지 못했습니다.");
  return stdout.toString("base64");
}

function describeProduct(p: ProductInfo) {
  const rows: [string, string][] = [
    ["상품명", p.name],
    ["산지", p.origin],
    ["크기·중량", p.size],
    ["가격", p.price],
    ["특징", p.features],
  ];
  const filled = rows.filter(([, v]) => v.trim());
  return filled.length
    ? filled.map(([k, v]) => `- ${k}: ${v.trim()}`).join("\n")
    : "- (입력된 상품 정보 없음. 장면만 보고 쓰되 사실을 지어내지 마세요.)";
}

/** 클립 수만큼 자막을 제안한다 */
export async function suggestCaptions(clips: Clip[], product: ProductInfo) {
  if (!hasCredentials()) {
    throw new CaptionConfigError(
      "AI 자막을 쓰려면 .env.local 파일에 ANTHROPIC_API_KEY를 넣고 서버를 다시 켜 주세요.",
    );
  }

  const frames = await Promise.all(clips.map(extractFrame));
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: `상품 정보:\n${describeProduct(product)}` },
  ];
  frames.forEach((data, i) => {
    content.push({ type: "text", text: `${i + 1}번 클립 (${clips[i].kind === "video" ? "영상" : "사진"}):` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  content.push({
    type: "text",
    text: `위 ${clips.length}개 클립에 순서대로 하나씩, 정확히 ${clips.length}개의 자막을 captions 배열로 주세요.`,
  });

  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    // 짧은 카피 작업이라 낮은 effort로 충분하다
    output_config: { effort: "low", format: betaZodOutputFormat(CaptionsSchema) },
    // 안전 분류기가 거절하면 서버에서 다른 모델로 자동 재시도
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("AI가 이 요청에 답하지 않았습니다. 상품 정보를 바꿔 다시 시도해 주세요.");
  }
  const captions = response.parsed_output?.captions;
  if (!captions) throw new Error("AI 응답을 읽지 못했습니다. 다시 시도해 주세요.");

  // 개수가 어긋나면 맞춰 주고, 길이 제한을 넘으면 자른다
  return clips.map((_, i) => (captions[i] ?? "").trim().slice(0, MAX_CAPTION_LENGTH));
}
