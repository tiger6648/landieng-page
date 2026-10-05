import { stat } from "node:fs/promises";
import { validateAudio, validateClips } from "@/lib/clips";
import { parseAudio, parseClips, readJsonBody } from "@/lib/server/parse";
import { renderVideo } from "@/lib/server/render";
import { mediaPath, musicPath, readSettings } from "@/lib/server/storage";

async function exists(file: string | null) {
  if (!file) return false;
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const clips = body && parseClips(body.clips);
  const audio = body && parseAudio(body.audio);
  if (!clips || !audio) {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const problems = [...validateClips(clips), ...validateAudio(audio)];
  if (problems.length > 0) {
    return Response.json({ error: problems.join("\n") }, { status: 422 });
  }
  for (const clip of clips) {
    if (!(await exists(mediaPath(clip.mediaId)))) {
      return Response.json(
        { error: `원본 파일을 찾을 수 없습니다: ${clip.name}. 다시 올려 주세요.` },
        { status: 404 },
      );
    }
  }
  if (audio.musicId && !(await exists(musicPath(audio.musicId)))) {
    return Response.json({ error: "선택한 배경 음악 파일이 없습니다." }, { status: 404 });
  }

  try {
    const renderId = await renderVideo(clips, audio, await readSettings());
    return Response.json({ renderId });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "영상 만들기에 실패했습니다." },
      { status: 500 },
    );
  }
}
