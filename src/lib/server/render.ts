import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import {
  clipDuration,
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  type Clip,
} from "@/lib/clips";
import { runFfmpeg } from "./ffmpeg";
import { mediaPath, renderDir } from "./storage";

const FPS = 30;
// 윈도우 기본 한글 글꼴. 다른 글꼴을 쓰려면 SUBTITLE_FONT 환경 변수로 지정
const SUBTITLE_FONT = process.env.SUBTITLE_FONT || "Malgun Gothic";

export const OUTPUT_FILE = "output.mp4";

function assTime(t: number) {
  const cs = Math.round(t * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}.${pad(c)}`;
}

/** ASS 제어 문자({ } \)를 막고 줄바꿈을 \N으로 바꾼다 */
function assText(text: string) {
  return text
    .trim()
    .replace(/\\/g, "＼")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/\r?\n/g, "\\N");
}

/** 클립마다 하나씩 자막을 띄우는 ASS 파일 내용 */
export function buildAss(clips: Clip[]) {
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${OUTPUT_WIDTH}`,
    `PlayResY: ${OUTPUT_HEIGHT}`,
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // 흰 글씨 + 검은 테두리, 화면 아래쪽 1/4 지점
    `Style: Default,${SUBTITLE_FONT},84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,80,80,420,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  let t = 0;
  for (const clip of clips) {
    const d = clipDuration(clip);
    const text = assText(clip.caption);
    if (text) {
      lines.push(`Dialogue: 0,${assTime(t)},${assTime(t + d)},Default,,0,0,0,,${text}`);
    }
    t += d;
  }
  return lines.join("\n") + "\n";
}

/** 클립을 이어 붙이고 자막을 입혀 1080x1920 MP4를 만든다. 성공하면 renderId를 돌려준다 */
export async function renderVideo(clips: Clip[]) {
  const renderId = randomUUID();
  const dir = renderDir(renderId)!;
  await mkdir(dir, { recursive: true });

  const inputs: string[] = [];
  const filters: string[] = [];

  clips.forEach((clip, i) => {
    const file = mediaPath(clip.mediaId);
    if (!file) throw new Error(`잘못된 미디어 ID: ${clip.mediaId}`);
    const d = clipDuration(clip).toFixed(3);

    if (clip.kind === "video") {
      inputs.push("-ss", clip.start.toFixed(3), "-t", d, "-i", file);
    } else {
      inputs.push("-loop", "1", "-framerate", String(FPS), "-t", d, "-i", file);
    }
    // 세로 화면을 꽉 채우도록 확대 후 가운데를 자른다
    filters.push(
      `[${i}:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,` +
        `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},setsar=1,fps=${FPS},format=yuv420p,` +
        `trim=duration=${d},setpts=PTS-STARTPTS[v${i}]`,
    );
  });

  const concatInputs = clips.map((_, i) => `[v${i}]`).join("");
  filters.push(`${concatInputs}concat=n=${clips.length}:v=1:a=0[vc]`);
  // 자막 파일은 상대 경로로 지정 (ffmpeg를 렌더 폴더에서 실행해 윈도우 경로 이스케이프를 피함)
  filters.push(`[vc]ass=subs.ass[vout]`);

  await writeFile(path.join(dir, "subs.ass"), buildAss(clips), "utf8");

  const args = [
    "-y",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    OUTPUT_FILE,
  ];

  const { code, stderr } = await runFfmpeg(args, dir);
  if (code !== 0) {
    await rm(dir, { recursive: true, force: true });
    console.error("[render] ffmpeg 실패\n", stderr.slice(-4000));
    throw new Error("영상 만들기에 실패했습니다.");
  }
  return renderId;
}
