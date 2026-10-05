import { stat } from "node:fs/promises";
import { MEDIA_ID_PATTERN, validateClips, type Clip } from "@/lib/clips";
import { renderVideo } from "@/lib/server/render";
import { mediaPath } from "@/lib/server/storage";

/** 요청 본문을 Clip 배열로 정리한다. 모양이 틀리면 null */
function parseClips(body: unknown): Clip[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { clips?: unknown }).clips))
    return null;
  const raw = (body as { clips: unknown[] }).clips;
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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const clips = parseClips(body);
  if (!clips) {
    return Response.json({ error: "클립 정보가 올바르지 않습니다." }, { status: 400 });
  }
  const problems = validateClips(clips);
  if (problems.length > 0) {
    return Response.json({ error: problems.join("\n") }, { status: 422 });
  }
  for (const clip of clips) {
    try {
      await stat(mediaPath(clip.mediaId)!);
    } catch {
      return Response.json(
        { error: `원본 파일을 찾을 수 없습니다: ${clip.name}. 다시 올려 주세요.` },
        { status: 404 },
      );
    }
  }

  try {
    const renderId = await renderVideo(clips);
    return Response.json({ renderId });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "영상 만들기에 실패했습니다." },
      { status: 500 },
    );
  }
}
