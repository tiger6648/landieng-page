import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ACCEPTED_EXTENSIONS, type UploadedMedia } from "@/lib/clips";
import { probeMedia } from "@/lib/server/ffmpeg";
import { ensureDirs, mediaPath } from "@/lib/server/storage";

const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1GB

/**
 * 파일 하나를 요청 본문 그대로 받아 디스크에 스트리밍 저장한다.
 * 큰 영상도 메모리에 올리지 않기 위해 FormData 대신 원본 바이트를 받는다.
 * 헤더 x-file-name: 원래 파일 이름(encodeURIComponent)
 */
export async function POST(request: Request) {
  const rawName = decodeURIComponent(request.headers.get("x-file-name") ?? "");
  const ext = rawName.split(".").pop()?.toLowerCase() ?? "";
  const kind = ACCEPTED_EXTENSIONS[ext];
  if (!kind) {
    return Response.json(
      { error: "지원하지 않는 파일 형식입니다. (mp4, mov, webm, jpg, png, webp)" },
      { status: 415 },
    );
  }
  if (!request.body) {
    return Response.json({ error: "파일 내용이 없습니다." }, { status: 400 });
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "파일은 1GB 이하만 올릴 수 있습니다." }, { status: 413 });
  }

  await ensureDirs();
  const mediaId = `${randomUUID()}.${ext}`;
  const file = mediaPath(mediaId)!;

  let received = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length;
      if (received > MAX_UPLOAD_BYTES) cb(new Error("too large"));
      else cb(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(request.body as import("node:stream/web").ReadableStream),
      limiter,
      createWriteStream(file),
    );
  } catch {
    await rm(file, { force: true });
    return Response.json({ error: "파일 저장에 실패했습니다." }, { status: 400 });
  }

  const info = await probeMedia(file);
  if (!info.hasVideo || (kind === "video" && info.duration <= 0)) {
    await rm(file, { force: true });
    return Response.json({ error: "영상이나 사진으로 읽을 수 없는 파일입니다." }, { status: 422 });
  }

  const result: UploadedMedia = {
    mediaId,
    kind,
    duration: kind === "video" ? info.duration : 0,
  };
  return Response.json(result);
}
