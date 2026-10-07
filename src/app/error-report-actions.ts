"use server";

import { notifyAdminOfError } from "@/lib/notify";

const MAX_LENGTH = { message: 500, stack: 4000, path: 300 };

// 브라우저에서 난 오류를 관리자 메일로 전달. 누구나 호출할 수 있으므로 길이를 자르고,
// 발송 횟수는 notifyAdminOfError의 제한을 따름
export async function reportClientError(report: {
  message: string;
  stack?: string;
  path?: string;
}): Promise<void> {
  const message = String(report?.message ?? "").slice(0, MAX_LENGTH.message);
  if (!message) return;

  await notifyAdminOfError({
    source: "client",
    message,
    stack: report?.stack
      ? String(report.stack).slice(0, MAX_LENGTH.stack)
      : undefined,
    path: report?.path ? String(report.path).slice(0, MAX_LENGTH.path) : undefined,
  });
}
