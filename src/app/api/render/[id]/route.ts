import path from "node:path";
import { OUTPUT_FILE } from "@/lib/server/render";
import { readRenderMeta, renderDir } from "@/lib/server/storage";
import { serveFile } from "@/lib/server/serve-file";

/** 완성 영상. ?download=1 이면 파일로 내려받기 (승인한 영상만) */
export async function GET(request: Request, ctx: RouteContext<"/api/render/[id]">) {
  const { id } = await ctx.params;
  const dir = renderDir(id);
  if (!dir) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  if (download) {
    const meta = await readRenderMeta(id);
    if (!meta?.approvedAt) {
      return new Response("승인한 영상만 내려받을 수 있습니다.", { status: 403 });
    }
  }
  return serveFile(request, path.join(dir, OUTPUT_FILE), {
    downloadName: download ? `대게광고_${id.slice(0, 8)}.mp4` : undefined,
  });
}
