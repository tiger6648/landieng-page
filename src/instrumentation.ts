import type { Instrumentation } from "next";

// 서버에서 잡히지 않은 오류(페이지 렌더링, 서버 액션, 라우트 핸들러)를 관리자 메일로 알림
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const { notifyAdminOfError } = await import("@/lib/notify");
  const err = error instanceof Error ? error : new Error(String(error));
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;

  await notifyAdminOfError({
    source: "server",
    message: err.message,
    stack: err.stack,
    digest,
    path: `${request.method} ${request.path}`,
    detail: `${context.routeType} (${context.routePath})`,
  });
};
