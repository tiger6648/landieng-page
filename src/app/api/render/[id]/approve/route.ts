import { readRenderMeta, writeRenderMeta } from "@/lib/server/storage";

/** 미리보기를 확인한 영상을 승인한다. 승인한 영상만 내려받기·업로드할 수 있다 */
export async function POST(_request: Request, ctx: RouteContext<"/api/render/[id]/approve">) {
  const { id } = await ctx.params;
  const meta = await readRenderMeta(id);
  if (!meta) return Response.json({ error: "영상을 찾을 수 없습니다." }, { status: 404 });

  if (!meta.approvedAt) {
    meta.approvedAt = new Date().toISOString();
    await writeRenderMeta(id, meta);
  }
  return Response.json({ approvedAt: meta.approvedAt });
}
