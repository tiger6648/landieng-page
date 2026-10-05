import "server-only";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

type RunResult = { code: number | null; stderr: string };

export function runFfmpeg(args: string[], cwd?: string): Promise<RunResult> {
  if (!ffmpegPath) throw new Error("ffmpeg 실행 파일을 찾을 수 없습니다.");
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath as string, ["-hide_banner", ...args], {
      cwd,
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      // 로그가 너무 길어지지 않도록 뒷부분만 유지
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr }));
  });
}

/** ffmpeg -i 출력에서 길이와 오디오 여부를 읽는다 */
export async function probeMedia(file: string) {
  const { stderr } = await runFfmpeg(["-i", file]);
  const m = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
  return {
    duration,
    hasVideo: /Stream #\S+.*Video:/.test(stderr),
    hasAudio: /Stream #\S+.*Audio:/.test(stderr),
  };
}
