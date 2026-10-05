import "server-only";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  DEFAULT_STORE,
  MEDIA_ID_PATTERN,
  MUSIC_ID_PATTERN,
  type MusicTrack,
  type StoreSettings,
} from "@/lib/clips";

// 업로드 원본과 완성 영상은 프로젝트 안의 data/ 폴더에 저장 (gitignore 대상)
const DATA_DIR = path.join(process.cwd(), "data");
export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const MUSIC_DIR = path.join(DATA_DIR, "music");
export const RENDER_DIR = path.join(DATA_DIR, "renders");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const MUSIC_INDEX = path.join(MUSIC_DIR, "index.json");

const RENDER_ID_PATTERN = /^[0-9a-f-]{36}$/;

export async function ensureDirs() {
  await mkdir(MEDIA_DIR, { recursive: true });
  await mkdir(MUSIC_DIR, { recursive: true });
  await mkdir(RENDER_DIR, { recursive: true });
}

/** mediaId 형식을 확인한 뒤 경로를 돌려준다. 형식이 틀리면 null (경로 조작 방지) */
export function mediaPath(mediaId: string) {
  return MEDIA_ID_PATTERN.test(mediaId) ? path.join(MEDIA_DIR, mediaId) : null;
}

export function musicPath(musicId: string) {
  return MUSIC_ID_PATTERN.test(musicId) ? path.join(MUSIC_DIR, musicId) : null;
}

export function renderDir(renderId: string) {
  return RENDER_ID_PATTERN.test(renderId) ? path.join(RENDER_DIR, renderId) : null;
}

/**
 * 요청 본문을 그대로 파일에 스트리밍 저장한다. 큰 파일도 메모리에 올리지 않는다.
 * 실패하면 만들던 파일을 지우고 false.
 */
export async function saveRequestBody(request: Request, file: string, maxBytes: number) {
  if (!request.body) return false;
  let received = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length;
      if (received > maxBytes) cb(new Error("too large"));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(request.body as import("node:stream/web").ReadableStream),
      limiter,
      createWriteStream(file),
    );
    return true;
  } catch {
    await rm(file, { force: true });
    return false;
  }
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function readSettings(): Promise<StoreSettings> {
  const saved = await readJson<Partial<StoreSettings>>(SETTINGS_FILE, {});
  return { ...DEFAULT_STORE, ...saved };
}

export async function writeSettings(settings: StoreSettings) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

export async function readMusicIndex(): Promise<MusicTrack[]> {
  return readJson<MusicTrack[]>(MUSIC_INDEX, []);
}

export async function writeMusicIndex(tracks: MusicTrack[]) {
  await mkdir(MUSIC_DIR, { recursive: true });
  await writeFile(MUSIC_INDEX, JSON.stringify(tracks, null, 2), "utf8");
}

export type RenderMeta = { createdAt: string; duration: number; approvedAt: string | null };

export async function readRenderMeta(renderId: string): Promise<RenderMeta | null> {
  const dir = renderDir(renderId);
  return dir ? readJson<RenderMeta | null>(path.join(dir, "meta.json"), null) : null;
}

export async function writeRenderMeta(renderId: string, meta: RenderMeta) {
  const dir = renderDir(renderId);
  if (!dir) throw new Error("잘못된 renderId");
  await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
}
