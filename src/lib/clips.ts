// 클라이언트와 서버가 함께 쓰는 클립 타입과 검증 규칙

export type MediaKind = "video" | "image";

export type Clip = {
  id: string;
  mediaId: string;
  kind: MediaKind;
  name: string;
  /** 원본 길이(초). 사진은 0 */
  sourceDuration: number;
  /** 원본에서 사용할 구간(초). 사진은 start=0, end=표시 시간 */
  start: number;
  end: number;
  caption: string;
};

export type UploadedMedia = {
  mediaId: string;
  kind: MediaKind;
  duration: number;
};

export const OUTPUT_WIDTH = 1080;
export const OUTPUT_HEIGHT = 1920;

export const MAX_CLIPS = 20;
export const MIN_CLIP_SECONDS = 0.5;
export const MAX_CLIP_SECONDS = 60;
export const MAX_TOTAL_SECONDS = 180;
export const DEFAULT_IMAGE_SECONDS = 3;
export const MAX_CAPTION_LENGTH = 60;

/** 업로드 가능한 확장자 → 종류 */
export const ACCEPTED_EXTENSIONS: Record<string, MediaKind> = {
  mp4: "video",
  mov: "video",
  m4v: "video",
  webm: "video",
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
};

export const MEDIA_ID_PATTERN = /^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/;

export function clipDuration(clip: Pick<Clip, "start" | "end">) {
  return Math.max(0, clip.end - clip.start);
}

export function totalDuration(clips: Clip[]) {
  return clips.reduce((sum, c) => sum + clipDuration(c), 0);
}

/** 렌더링 전에 확인할 문제 목록. 비어 있으면 렌더링 가능 */
export function validateClips(clips: Clip[]): string[] {
  const problems: string[] = [];
  if (clips.length === 0) problems.push("영상이나 사진을 하나 이상 올려 주세요.");
  if (clips.length > MAX_CLIPS)
    problems.push(`클립은 최대 ${MAX_CLIPS}개까지 넣을 수 있습니다.`);

  clips.forEach((clip, i) => {
    const label = `${i + 1}번 클립`;
    const d = clipDuration(clip);
    if (!Number.isFinite(clip.start) || !Number.isFinite(clip.end) || clip.start < 0)
      problems.push(`${label}: 구간이 올바르지 않습니다.`);
    else if (d < MIN_CLIP_SECONDS)
      problems.push(`${label}: ${MIN_CLIP_SECONDS}초 이상이어야 합니다.`);
    else if (d > MAX_CLIP_SECONDS)
      problems.push(`${label}: ${MAX_CLIP_SECONDS}초 이하여야 합니다.`);
    if (clip.kind === "video" && clip.end > clip.sourceDuration + 0.05)
      problems.push(`${label}: 끝 지점이 원본 길이보다 깁니다.`);
    if (clip.caption.length > MAX_CAPTION_LENGTH)
      problems.push(`${label}: 자막은 ${MAX_CAPTION_LENGTH}자 이내로 써 주세요.`);
  });

  if (totalDuration(clips) > MAX_TOTAL_SECONDS)
    problems.push(`전체 길이는 ${MAX_TOTAL_SECONDS}초 이하여야 합니다.`);

  return problems;
}

export function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}
