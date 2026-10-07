import { Resend } from "resend";
import type { ContactValues } from "@/lib/contact";

const apiKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
// 도메인 인증 전에는 Resend 기본 발신 주소를 사용 (가입한 본인 메일로만 발송 가능)
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "문의 알림 <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

// 새 문의를 관리자 메일로 알림. 실패해도 문의는 이미 DB에 저장되어 있으므로 예외를 던지지 않음
export async function notifyAdminOfContact(
  contact: ContactValues,
  createdAt: Date,
): Promise<void> {
  if (!resend || !adminEmail) {
    console.warn(
      "RESEND_API_KEY or ADMIN_EMAIL is not set; skipping admin notification",
    );
    return;
  }

  const receivedAt = createdAt.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ");

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      replyTo: contact.email,
      subject: `[새 문의] ${singleLine(contact.name)}님의 문의`,
      text: [
        "새 문의가 접수되었습니다.",
        "",
        `이름: ${contact.name}`,
        `전화번호: ${contact.phone}`,
        `이메일: ${contact.email}`,
        `접수 시각: ${receivedAt}`,
        "",
        "문의 내용:",
        contact.message,
        "",
        "이 메일에 답장하면 문의자에게 바로 회신됩니다.",
      ].join("\n"),
    });
    if (error) console.error("Failed to send admin notification", error);
  } catch (error) {
    console.error("Failed to send admin notification", error);
  }
}

// 서버 액션이 잡아서 사용자에게는 안내 메시지로 돌려준 오류(DB 실패 등)를 로그에 남기고 관리자에게 알림
export async function reportServerError(
  label: string,
  error: unknown,
): Promise<void> {
  console.error(label, error);
  const err = error instanceof Error ? error : new Error(String(error));
  await notifyAdminOfError({
    source: "server",
    message: err.message,
    stack: err.stack,
    detail: label,
  });
}

export type ErrorReport = {
  source: "server" | "client";
  message: string;
  stack?: string;
  digest?: string;
  path?: string;
  detail?: string;
};

// 오류가 반복될 때 메일이 쏟아지지 않도록 제한 (서버 인스턴스별 메모리 기준)
const SAME_ERROR_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_ERROR_EMAILS_PER_HOUR = 20;
const lastSentByKey = new Map<string, number>();
let hourlyWindowStart = 0;
let hourlySentCount = 0;

function shouldSendErrorEmail(key: string): boolean {
  const now = Date.now();
  const lastSent = lastSentByKey.get(key);
  if (lastSent !== undefined && now - lastSent < SAME_ERROR_COOLDOWN_MS) {
    return false;
  }
  if (now - hourlyWindowStart >= 60 * 60 * 1000) {
    hourlyWindowStart = now;
    hourlySentCount = 0;
  }
  if (hourlySentCount >= MAX_ERROR_EMAILS_PER_HOUR) return false;

  hourlySentCount += 1;
  lastSentByKey.set(key, now);
  return true;
}

// 예상치 못한 오류를 관리자 메일로 알림. 알림 실패가 원래 오류 처리를 방해하지 않도록 예외를 던지지 않음
export async function notifyAdminOfError(report: ErrorReport): Promise<void> {
  if (!resend || !adminEmail) return;
  if (!shouldSendErrorEmail(`${report.source}:${report.message}`)) return;

  const occurredAt = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const singleLine = (value: string) =>
    value.replace(/[\r\n]+/g, " ").slice(0, 120);

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `[오류] ${singleLine(report.message)}`,
      text: [
        "예상치 못한 오류가 발생했습니다.",
        "",
        `발생 위치: ${report.source === "server" ? "서버" : "브라우저"}`,
        `발생 시각: ${occurredAt}`,
        `경로: ${report.path ?? "-"}`,
        `오류 코드(digest): ${report.digest ?? "-"}`,
        ...(report.detail ? [`상세: ${report.detail}`] : []),
        "",
        "메시지:",
        report.message,
        "",
        "스택:",
        report.stack ?? "-",
        "",
        `같은 오류는 ${SAME_ERROR_COOLDOWN_MS / 60000}분에 한 번, 전체는 시간당 ${MAX_ERROR_EMAILS_PER_HOUR}통까지만 보냅니다.`,
      ].join("\n"),
    });
    if (error) console.error("Failed to send error notification", error);
  } catch (error) {
    console.error("Failed to send error notification", error);
  }
}
