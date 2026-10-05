import { mediaPath } from "@/lib/server/storage";
import { serveFile } from "@/lib/server/serve-file";

export async function GET(request: Request, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  const file = mediaPath(id);
  if (!file) return new Response("Not found", { status: 404 });
  return serveFile(request, file);
}
