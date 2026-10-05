import "server-only";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { MEDIA_ID_PATTERN } from "@/lib/clips";

// 업로드 원본과 완성 영상은 프로젝트 안의 data/ 폴더에 저장 (gitignore 대상)
const DATA_DIR = path.join(process.cwd(), "data");
export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const RENDER_DIR = path.join(DATA_DIR, "renders");

const RENDER_ID_PATTERN = /^[0-9a-f-]{36}$/;

export async function ensureDirs() {
  await mkdir(MEDIA_DIR, { recursive: true });
  await mkdir(RENDER_DIR, { recursive: true });
}

/** mediaId 형식을 확인한 뒤 경로를 돌려준다. 형식이 틀리면 null (경로 조작 방지) */
export function mediaPath(mediaId: string) {
  return MEDIA_ID_PATTERN.test(mediaId) ? path.join(MEDIA_DIR, mediaId) : null;
}

export function renderDir(renderId: string) {
  return RENDER_ID_PATTERN.test(renderId) ? path.join(RENDER_DIR, renderId) : null;
}
