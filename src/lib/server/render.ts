import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import {
  clipDuration,
  END_CARD_SECONDS,
  endCardActive,
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  totalDuration,
  type AudioSettings,
  type Clip,
  type StoreSettings,
} from "@/lib/clips";
import { probeMedia, runFfmpeg } from "./ffmpeg";
import { mediaPath, musicPath, renderDir, writeRenderMeta } from "./storage";

const FPS = 30;
const AUDIO_RATE = 48000;
const END_CARD_COLOR = "0x0b2545";
const MUSIC_FADE_SECONDS = 1.5;
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

/** 클립마다 하나씩 자막을 띄우고, 끝 화면이 있으면 전화 주문 안내를 넣는 ASS 파일 내용 */
export function buildAss(clips: Clip[], store: StoreSettings) {
  const style =
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding";
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${OUTPUT_WIDTH}`,
    `PlayResY: ${OUTPUT_HEIGHT}`,
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    style,
    // 흰 글씨 + 검은 테두리, 화면 아래쪽 1/4 지점
    `Style: Default,${SUBTITLE_FONT},84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,80,80,420,1`,
    // 끝 화면: 화면 가운데, 더 큰 글씨
    `Style: EndCard,${SUBTITLE_FONT},96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,80,80,0,1`,
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

  if (endCardActive(store)) {
    const name = assText(store.storeName);
    // 노란색(&H0000D7FF) 전화번호를 가장 크게
    const text =
      (name ? `{\\fs72}${name}\\N\\N` : "") +
      `{\\fs96}전화 주문\\N{\\fs120\\c&H0000D7FF&}${assText(store.phone)}`;
    lines.push(
      `Dialogue: 0,${assTime(t)},${assTime(t + END_CARD_SECONDS)},EndCard,,0,0,0,,${text}`,
    );
  }
  return lines.join("\n") + "\n";
}

/**
 * 클립을 이어 붙이고 자막·음악·끝 화면을 입혀 1080x1920 MP4를 만든다.
 * 성공하면 renderId를 돌려준다.
 */
export async function renderVideo(clips: Clip[], audio: AudioSettings, store: StoreSettings) {
  const renderId = randomUUID();
  const dir = renderDir(renderId)!;
  await mkdir(dir, { recursive: true });

  const inputs: string[] = [];
  const filters: string[] = [];
  const segments: string[] = [];
  let inputIndex = 0;

  for (const [i, clip] of clips.entries()) {
    const file = mediaPath(clip.mediaId);
    if (!file) throw new Error(`잘못된 미디어 ID: ${clip.mediaId}`);
    const d = clipDuration(clip).toFixed(3);
    const idx = inputIndex++;

    let useOriginal = false;
    if (clip.kind === "video") {
      inputs.push("-ss", clip.start.toFixed(3), "-t", d, "-i", file);
      useOriginal = audio.keepOriginal && (await probeMedia(file)).hasAudio;
    } else {
      inputs.push("-loop", "1", "-framerate", String(FPS), "-t", d, "-i", file);
    }

    // 세로 화면을 꽉 채우도록 확대 후 가운데를 자른다
    filters.push(
      `[${idx}:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,` +
        `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},setsar=1,fps=${FPS},format=yuv420p,` +
        `trim=duration=${d},setpts=PTS-STARTPTS[v${i}]`,
    );
    // concat에 넣으려면 모든 구간에 같은 형식의 오디오가 있어야 한다. 소리가 없으면 무음으로 채운다
    filters.push(
      useOriginal
        ? `[${idx}:a]aresample=${AUDIO_RATE},aformat=channel_layouts=stereo,` +
            `volume=${audio.originalVolume.toFixed(2)},apad,atrim=duration=${d},asetpts=PTS-STARTPTS[a${i}]`
        : `anullsrc=r=${AUDIO_RATE}:cl=stereo,atrim=duration=${d}[a${i}]`,
    );
    segments.push(`[v${i}][a${i}]`);
  }

  let total = totalDuration(clips);
  if (endCardActive(store)) {
    const d = END_CARD_SECONDS.toFixed(3);
    filters.push(
      `color=c=${END_CARD_COLOR}:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:r=${FPS}:d=${d},format=yuv420p,setsar=1[vend]`,
    );
    filters.push(`anullsrc=r=${AUDIO_RATE}:cl=stereo,atrim=duration=${d}[aend]`);
    segments.push("[vend][aend]");
    total += END_CARD_SECONDS;
  }

  filters.push(`${segments.join("")}concat=n=${segments.length}:v=1:a=1[vc][ac]`);
  // 자막 파일은 상대 경로로 지정 (ffmpeg를 렌더 폴더에서 실행해 윈도우 경로 이스케이프를 피함)
  filters.push(`[vc]ass=subs.ass[vout]`);

  const music = audio.musicId ? musicPath(audio.musicId) : null;
  if (music) {
    const idx = inputIndex++;
    // 음악이 영상보다 짧으면 반복하고, 끝에서 서서히 줄인다
    inputs.push("-stream_loop", "-1", "-i", music);
    const fadeStart = Math.max(0, total - MUSIC_FADE_SECONDS).toFixed(3);
    filters.push(
      `[${idx}:a]aresample=${AUDIO_RATE},aformat=channel_layouts=stereo,` +
        `volume=${audio.musicVolume.toFixed(2)},atrim=duration=${total.toFixed(3)},` +
        `afade=t=out:st=${fadeStart}:d=${MUSIC_FADE_SECONDS},asetpts=PTS-STARTPTS[music]`,
    );
    filters.push(`[ac][music]amix=inputs=2:duration=first:normalize=0[aout]`);
  } else {
    filters.push(`[ac]anull[aout]`);
  }

  await writeFile(path.join(dir, "subs.ass"), buildAss(clips, store), "utf8");

  const args = [
    "-y",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    "-t",
    total.toFixed(3),
    OUTPUT_FILE,
  ];

  const { code, stderr } = await runFfmpeg(args, dir);
  if (code !== 0) {
    await rm(dir, { recursive: true, force: true });
    console.error("[render] ffmpeg 실패\n", stderr.slice(-4000));
    throw new Error("영상 만들기에 실패했습니다.");
  }

  await writeRenderMeta(renderId, {
    createdAt: new Date().toISOString(),
    duration: total,
    approvedAt: null,
  });
  return renderId;
}
