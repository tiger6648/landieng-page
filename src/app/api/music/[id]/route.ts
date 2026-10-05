import { rm } from "node:fs/promises";
import { serveFile } from "@/lib/server/serve-file";
import { musicPath, readMusicIndex, writeMusicIndex } from "@/lib/server/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/music/[id]">) {
  const { id } = await ctx.params;
  const file = musicPath(id);
  if (!file) return new Response("Not found", { status: 404 });
  return serveFile(request, file);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/music/[id]">) {
  const { id } = await ctx.params;
  const file = musicPath(id);
  if (!file) return new Response("Not found", { status: 404 });
  await rm(file, { force: true });
  await writeMusicIndex((await readMusicIndex()).filter((t) => t.musicId !== id));
  return new Response(null, { status: 204 });
}
