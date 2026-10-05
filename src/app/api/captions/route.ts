import Anthropic from "@anthropic-ai/sdk";
import { MAX_CLIPS } from "@/lib/clips";
import { CaptionConfigError, suggestCaptions } from "@/lib/server/captions";
import { parseClips, parseProduct, readJsonBody } from "@/lib/server/parse";

/** 클립 장면과 상품 정보로 자막을 제안한다 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const clips = body && parseClips(body.clips);
  if (!body || !clips) {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (clips.length === 0 || clips.length > MAX_CLIPS) {
    return Response.json({ error: "클립이 1개 이상 있어야 합니다." }, { status: 422 });
  }

  try {
    const captions = await suggestCaptions(clips, parseProduct(body.product));
    return Response.json({ captions });
  } catch (e) {
    if (e instanceof CaptionConfigError) {
      return Response.json({ error: e.message, setup: true }, { status: 503 });
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { error: "Claude API 키가 올바르지 않습니다. .env.local의 ANTHROPIC_API_KEY를 확인해 주세요.", setup: true },
        { status: 503 },
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "요청이 많아 잠시 막혔습니다. 1분 뒤 다시 시도해 주세요." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      console.error("[captions] API 오류", e.status, e.message);
      return Response.json({ error: "AI 서비스 오류로 자막을 만들지 못했습니다." }, { status: 502 });
    }
    console.error("[captions]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "자막을 만들지 못했습니다." },
      { status: 500 },
    );
  }
}
