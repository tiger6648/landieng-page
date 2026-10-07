"use client";

import ErrorView from "@/components/ErrorView";

// 페이지 렌더링 중 예상치 못한 오류 (예: /admin의 DB 조회 실패)
export default function ErrorPage(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView {...props} />;
}
