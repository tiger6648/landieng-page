"use client";

import { useTransition } from "react";
import { deleteContact } from "./actions";

export default function DeleteButton({ id, name }: { id: number; name: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!confirm(`${name}님의 문의를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      const result = await deleteContact(id);
      // 버튼이 카드 헤더 줄에 있어 인라인 메시지 대신 alert로 알림
      if (!result.ok) alert(result.error);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
    >
      {isPending ? "삭제 중..." : "삭제"}
    </button>
  );
}
