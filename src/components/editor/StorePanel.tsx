"use client";

import { useState } from "react";
import { END_CARD_SECONDS, PHONE_PATTERN, type StoreSettings } from "@/lib/clips";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:bg-zinc-900";

/** 가게 이름·전화번호와 끝 화면 설정. 서버에 저장되어 모든 영상에 쓰인다 */
export default function StorePanel({
  store,
  onSaved,
}: {
  store: StoreSettings;
  onSaved: (s: StoreSettings) => void;
}) {
  const [draft, setDraft] = useState(store);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const phoneInvalid = draft.phone.trim() !== "" && !PHONE_PATTERN.test(draft.phone.trim());
  const dirty = JSON.stringify(draft) !== JSON.stringify(store);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "저장하지 못했습니다.");
      onSaved(data);
      setDraft(data);
      setMessage({ ok: true, text: "저장했습니다." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "저장하지 못했습니다." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label="전화 주문 안내"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div>
        <h2 className="text-lg font-semibold">전화 주문 안내</h2>
        <p className="text-sm text-zinc-500">
          영상 끝에 {END_CARD_SECONDS}초 동안 가게 이름과 주문 전화번호를 보여 줍니다. 한 번 저장하면
          계속 쓰입니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">가게 이름</span>
            <input
              value={draft.storeName}
              onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
              placeholder="예) 바다대게"
              maxLength={30}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">주문 전화번호</span>
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="010-1234-5678"
              inputMode="tel"
              aria-invalid={phoneInvalid}
              className={inputClass}
            />
            {phoneInvalid && (
              <span className="text-xs text-red-600">예) 010-1234-5678 형식으로 입력해 주세요.</span>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.endCard}
              onChange={(e) => setDraft({ ...draft, endCard: e.target.checked })}
              className="h-4 w-4 accent-sky-600"
            />
            영상 끝에 전화 주문 화면 붙이기
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || phoneInvalid || !dirty}
              className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            {message && (
              <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>

        {/* 끝 화면 미리보기 (src/lib/server/render.ts의 EndCard 스타일과 맞춤) */}
        <div
          aria-hidden
          className={`flex aspect-[9/16] flex-col items-center justify-center gap-1 rounded-lg bg-[#0b2545] p-2 text-center font-bold text-white ${
            draft.endCard && draft.phone ? "" : "opacity-30"
          }`}
        >
          {draft.storeName && <span className="text-[11px]">{draft.storeName}</span>}
          <span className="text-xs">전화 주문</span>
          <span className="text-[13px] text-[#FFD700]">{draft.phone || "010-0000-0000"}</span>
        </div>
      </div>
    </section>
  );
}
