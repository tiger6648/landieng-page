import "server-only";
import {
  DEFAULT_AUDIO,
  EMPTY_PRODUCT,
  MEDIA_ID_PATTERN,
  MUSIC_ID_PATTERN,
  type AudioSettings,
  type Clip,
  type ProductInfo,
} from "@/lib/clips";

/** 요청 본문의 clips를 Clip 배열로 정리한다. 모양이 틀리면 null */
export function parseClips(raw: unknown): Clip[] | null {
  if (!Array.isArray(raw)) return null;
  const clips: Clip[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") return null;
    const o = c as Record<string, unknown>;
    const mediaId = String(o.mediaId ?? "");
    if (!MEDIA_ID_PATTERN.test(mediaId)) return null;
    if (o.kind !== "video" && o.kind !== "image") return null;
    clips.push({
      id: String(o.id ?? ""),
      mediaId,
      kind: o.kind,
      name: String(o.name ?? ""),
      sourceDuration: Number(o.sourceDuration),
      start: Number(o.start),
      end: Number(o.end),
      caption: String(o.caption ?? ""),
    });
  }
  return clips;
}

export function parseAudio(raw: unknown): AudioSettings | null {
  if (raw === undefined) return DEFAULT_AUDIO;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const musicId = o.musicId === null || o.musicId === undefined ? null : String(o.musicId);
  if (musicId !== null && !MUSIC_ID_PATTERN.test(musicId)) return null;
  return {
    musicId,
    musicVolume: Number(o.musicVolume ?? DEFAULT_AUDIO.musicVolume),
    keepOriginal: Boolean(o.keepOriginal),
    originalVolume: Number(o.originalVolume ?? DEFAULT_AUDIO.originalVolume),
  };
}

export function parseProduct(raw: unknown): ProductInfo {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const field = (k: keyof ProductInfo) => String(o[k] ?? "").slice(0, 200);
  return {
    ...EMPTY_PRODUCT,
    name: field("name"),
    origin: field("origin"),
    size: field("size"),
    price: field("price"),
    features: field("features"),
  };
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}
