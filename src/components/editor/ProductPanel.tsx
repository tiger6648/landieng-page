"use client";

import { useState } from "react";
import type { Clip, ProductInfo } from "@/lib/clips";

const FIELDS: { key: keyof ProductInfo; label: string; placeholder: string }[] = [
  { key: "name", label: "상품명", placeholder: "예) 영덕 박달대게" },
  { key: "origin", label: "산지", placeholder: "예) 경북 영덕 강구항" },
  { key: "size", label: "크기·중량", placeholder: "예) 마리당 1.2kg 내외" },
  { key: "price", label: "가격", placeholder: "예) 2마리 89,000원" },
];

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900";

export default function ProductPanel({
  product,
  onChange,
  clips,
  onCaptions,
}: {
  product: ProductInfo;
  onChange: (p: ProductInfo) => void;
  clips: Clip[];
  onCaptions: (captions: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = async () => {
    if (
      clips.some((c) => c.caption.trim()) &&
      !confirm("이미 입력한 자막이 AI 제안으로 바뀝니다. 계속할까요?")
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/captions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clips, product }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.captions)) {
        throw new Error(data.error ?? "자막을 만들지 못했습니다.");
      }
      onCaptions(data.captions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "자막을 만들지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label="상품 정보와 AI 자막"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">상품 정보</h2>
          <p className="text-sm text-zinc-500">
            입력한 내용과 영상 장면을 보고 AI가 클립별 자막을 제안합니다. 비워 둔 항목은 자막에 쓰지
            않습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={suggest}
          disabled={loading || clips.length === 0}
          className="h-10 shrink-0 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "자막 만드는 중..." : "AI 자막 제안"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{f.label}</span>
            <input
              value={product[f.key]}
              onChange={(e) => onChange({ ...product, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              maxLength={200}
              className={inputClass}
            />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">특징</span>
        <input
          value={product.features}
          onChange={(e) => onChange({ ...product, features: e.target.value })}
          placeholder="예) 당일 새벽 경매, 산지에서 바로 쪄서 발송"
          maxLength={200}
          className={inputClass}
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        AI 제안은 출발점입니다. 사실과 다른 내용이 없는지 확인하고 클립별로 고쳐 주세요.
      </p>
    </section>
  );
}
