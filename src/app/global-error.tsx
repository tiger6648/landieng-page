"use client";

import ErrorView from "@/components/ErrorView";
// global-error는 루트 레이아웃을 대체하므로 전역 스타일을 직접 불러옴
import "./globals.css";

// 루트 레이아웃 자체에서 난 오류
export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <title>오류가 발생했습니다</title>
        <ErrorView {...props} />
      </body>
    </html>
  );
}
