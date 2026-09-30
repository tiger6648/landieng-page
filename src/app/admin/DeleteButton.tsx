"use client";

import { useTransition } from "react";
import { deleteContact } from "./actions";

export default function DeleteButton({ id, name }: { id: number; name: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!confirm(`${name}님의 문의를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    startTransition(() => deleteContact(id));
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
