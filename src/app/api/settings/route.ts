import { PHONE_PATTERN, type StoreSettings } from "@/lib/clips";
import { readJsonBody } from "@/lib/server/parse";
import { readSettings, writeSettings } from "@/lib/server/storage";

export async function GET() {
  return Response.json(await readSettings());
}

export async function PUT(request: Request) {
  const body = await readJsonBody(request);
  if (!body) return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });

  const settings: StoreSettings = {
    storeName: String(body.storeName ?? "").trim().slice(0, 30),
    phone: String(body.phone ?? "").trim(),
    endCard: Boolean(body.endCard),
  };
  if (settings.phone && !PHONE_PATTERN.test(settings.phone)) {
    return Response.json(
      { error: "전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" },
      { status: 422 },
    );
  }
  await writeSettings(settings);
  return Response.json(settings);
}
