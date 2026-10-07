import { unstable_rethrow } from "next/navigation";
import posthog from "posthog-js";
import { reportClientError } from "@/app/error-report-actions";

export const UNEXPECTED_ERROR_MESSAGE =
  "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

// 브라우저 콘솔에 남기고, PostHog가 켜져 있으면 예외로 수집 (/admin은 before_send에서 제외됨)
// 브라우저에서 난 오류는 서버로 보내 관리자 메일로 알림
export function reportError(error: unknown): void {
  console.error(error);
  if (posthog.__loaded) posthog.captureException(error);

  // digest가 있으면 서버에서 난 오류라 instrumentation.ts의 onRequestError가 이미 알림을 보냄
  if (typeof error === "object" && error !== null && "digest" in error) return;
  const err = error instanceof Error ? error : new Error(String(error));
  reportClientError({
    message: err.message,
    stack: err.stack,
    path: window.location.pathname,
  }).catch(() => {
    // 네트워크가 끊긴 경우 등. 알림 실패로 다시 오류를 만들지 않음
  });
}

// 네트워크 끊김, 서버 500, 재배포 후 액션 ID 불일치 등으로 서버 액션 호출 자체가 실패하면
// startTransition 밖으로 던져져 페이지 전체가 에러 화면으로 바뀌므로, null을 돌려줘 호출한 쪽에서 처리하게 함
export async function callAction<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    // 서버 액션의 redirect()는 클라이언트에서 오류로 전달되므로 Next.js가 처리하도록 다시 던짐
    unstable_rethrow(error);
    reportError(error);
    return null;
  }
}
