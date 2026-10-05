"use client";

import { useEffect, useState } from "react";
import {
  END_CARD_SECONDS,
  endCardActive,
  formatSeconds,
  totalDuration,
  validateAudio,
  validateClips,
  type AudioSettings,
  type Clip,
  type StoreSettings,
} from "@/lib/clips";

type Result = { renderId: string; signature: string; approvedAt: string | null };

const signatureOf = (clips: Clip[], audio: AudioSettings, store: StoreSettings) =>
  JSON.stringify([
    clips.map(({ mediaId, start, end, caption }) => [mediaId, start, end, caption]),
    audio,
    store,
  ]);

export default function RenderPanel({
  clips,
  audio,
  store,
}: {
  clips: Clip[];
  audio: AudioSettings;
  store: StoreSettings;
}) {
  const [rendering, setRendering] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [approving, setApproving] = useState(false);

  const problems = [...validateClips(clips), ...validateAudio(audio)];
  const withEndCard = endCardActive(store);
  const total = totalDuration(clips) + (withEndCard ? END_CARD_SECONDS : 0);
  const stale = result !== null && result.signature !== signatureOf(clips, audio, store);

  useEffect(() => {
    if (!rendering) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 500);
    return () => clearInterval(timer);
  }, [rendering]);

  const render = async () => {
    setRendering(true);
    setElapsed(0);
    setError(null);
    const signature = signatureOf(clips, audio, store);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clips, audio }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.renderId) throw new Error(data.error ?? "영상 만들기에 실패했습니다.");
      setResult({ renderId: data.renderId, signature, approvedAt: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상 만들기에 실패했습니다.");
    } finally {
      setRendering(false);
    }
  };

  const approve = async () => {
    if (!result) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/render/${result.renderId}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "승인하지 못했습니다.");
      setResult({ ...result, approvedAt: data.approvedAt });
    } catch (e) {
      setError(e instanceof Error ? e.message : "승인하지 못했습니다.");
    } finally {
      setApproving(false);
    }
  };

  return (
    <section
      aria-label="영상 만들기"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">영상 만들기</h2>
          <p className="text-sm text-zinc-500">
            세로형 1080×1920 MP4 · 전체 길이 {formatSeconds(total)} · 클립 {clips.length}개
            {withEndCard ? " + 전화 주문 화면" : ""}
            {audio.musicId ? " · 배경 음악" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={render}
          disabled={rendering || problems.length > 0}
          className="h-11 rounded-lg bg-sky-600 px-6 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {rendering ? `만드는 중... ${Math.floor(elapsed)}초` : result ? "다시 만들기" : "영상 만들기"}
        </button>
      </div>

      {problems.length > 0 && clips.length > 0 && (
        <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-400">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {!withEndCard && clips.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          전화 주문 화면이 꺼져 있습니다. 아래 &lsquo;전화 주문 안내&rsquo;에서 전화번호를 저장하면 영상
          끝에 붙습니다.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="whitespace-pre-line rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <video
            key={result.renderId}
            src={`/api/render/${result.renderId}`}
            controls
            playsInline
            className="aspect-[9/16] w-full max-w-[240px] rounded-lg bg-black"
          />
          <div className="flex max-w-md flex-col gap-3">
            {stale && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                영상을 만든 뒤 편집 내용이 바뀌었습니다. 반영하려면 다시 만들어 주세요.
              </p>
            )}

            {result.approvedAt ? (
              <>
                <p className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  ✓ 승인됨
                </p>
                <a
                  href={`/api/render/${result.renderId}?download=1`}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  MP4 내려받기
                </a>
                <p className="text-xs text-zinc-500">
                  틱톡, 유튜브 쇼츠, 인스타그램 릴스에 그대로 올릴 수 있는 크기입니다.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm">
                  끝까지 재생해 보고 자막, 소리, 전화번호가 맞는지 확인해 주세요. 승인한 영상만 내려받을
                  수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={approve}
                  disabled={approving}
                  className="h-11 rounded-lg bg-emerald-600 px-5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {approving ? "승인 중..." : "이 영상 승인하기"}
                </button>
                <p className="text-xs text-zinc-500">
                  고칠 곳이 있으면 위에서 수정한 뒤 &lsquo;다시 만들기&rsquo;를 누르세요.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
