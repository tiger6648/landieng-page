import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && getSecret());
}

function sign(expiresAt: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`admin.${expiresAt}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  // 길이가 달라도 비교 시간이 같도록 해시끼리 비교
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !getSecret()) return false;
  return safeEqual(password, expected);
}

export async function createAdminSession(): Promise<void> {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");

  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${expiresAt}.${sign(expiresAt, secret)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  // 비밀값 확인보다 먼저 쿠키를 읽어야 빌드 시 env가 없어도 페이지가 동적으로 렌더링됨
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  const secret = getSecret();
  if (!value || !secret) return false;

  const [expiresRaw, signature] = value.split(".");
  const expiresAt = Number(expiresRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }
  return safeEqual(signature, sign(expiresAt, secret));
}
