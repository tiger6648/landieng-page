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
