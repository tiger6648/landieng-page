import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { ACCEPTED_MUSIC_EXTENSIONS, type MusicTrack } from "@/lib/clips";
import { probeMedia } from "@/lib/server/ffmpeg";
import {
  ensureDirs,
  musicPath,
  readMusicIndex,
  saveRequestBody,
  writeMusicIndex,
} from "@/lib/server/storage";

const MAX_MUSIC_BYTES = 50 * 1024 * 1024; // 50MB

export async function GET() {
  return Response.json(await readMusicIndex());
}

/** 음악 파일 하나를 업로드한다. 헤더 x-file-name: 원래 파일 이름(encodeURIComponent) */
export async function POST(request: Request) {
  const rawName = decodeURIComponent(request.headers.get("x-file-name") ?? "");
  const ext = rawName.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_MUSIC_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: "지원하지 않는 음악 형식입니다. (mp3, m4a, aac, wav, ogg)" },
      { status: 415 },
    );
  }

  await ensureDirs();
  const musicId = `${randomUUID()}.${ext}`;
  const file = musicPath(musicId)!;
  if (!(await saveRequestBody(request, file, MAX_MUSIC_BYTES))) {
    return Response.json({ error: "음악 파일은 50MB 이하만 올릴 수 있습니다." }, { status: 400 });
  }

  const info = await probeMedia(file);
  if (!info.hasAudio || info.duration <= 0) {
    await rm(file, { force: true });
    return Response.json({ error: "음악으로 읽을 수 없는 파일입니다." }, { status: 422 });
  }

  const track: MusicTrack = {
    musicId,
    name: rawName.replace(/\.[^.]+$/, "").slice(0, 60) || "음악",
    duration: info.duration,
  };
  await writeMusicIndex([...(await readMusicIndex()), track]);
  return Response.json(track);
}
