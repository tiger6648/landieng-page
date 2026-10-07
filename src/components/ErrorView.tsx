"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/client-error";

// error.tsx와 global-error.tsx가 함께 쓰는 오류 화면
export default function ErrorView({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <main
        role="alert"
        className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-zinc-200 sm:p-10 dark:bg-zinc-950 dark:ring-zinc-800"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          문제가 발생했습니다
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요.
        </p>
        {/* 서버 오류는 운영 환경에서 메시지 대신 digest만 전달되며, 서버 로그와 대조할 때 사용 */}
        {error.digest && (
          <p className="mt-2 text-xs text-zinc-500">오류 코드: {error.digest}</p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="h-11 rounded-lg bg-zinc-900 px-5 font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            다시 시도
          </button>
          {/* 오류가 난 레이아웃을 벗어나도록 클라이언트 라우터 대신 전체 페이지를 새로 불러옴 */}
          <button
            type="button"
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 의도적으로 전체 새로고침
            onClick={() => window.location.assign("/")}
            className="h-11 rounded-lg border border-zinc-300 px-5 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            처음으로
          </button>
        </div>
      </main>
    </div>
  );
}
