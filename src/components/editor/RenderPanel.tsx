"use client";

import { useEffect, useState } from "react";
import { formatSeconds, totalDuration, validateClips, type Clip } from "@/lib/clips";

type Result = { renderId: string; signature: string };

const signatureOf = (clips: Clip[]) =>
  JSON.stringify(clips.map(({ mediaId, start, end, caption }) => [mediaId, start, end, caption]));

export default function RenderPanel({ clips }: { clips: Clip[] }) {
  const [rendering, setRendering] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const problems = validateClips(clips);
  const total = totalDuration(clips);
  const stale = result !== null && result.signature !== signatureOf(clips);

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
    const signature = signatureOf(clips);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clips }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.renderId) throw new Error(data.error ?? "영상 만들기에 실패했습니다.");
      setResult({ renderId: data.renderId, signature });
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상 만들기에 실패했습니다.");
    } finally {
      setRendering(false);
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

      {error && (
        <p role="alert" className="whitespace-pre-line rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <video
            key={result.renderId}
            src={`/api/render/${result.renderId}`}
            controls
            playsInline
            className="aspect-[9/16] w-full max-w-[240px] rounded-lg bg-black"
          />
          <div className="flex flex-col gap-3">
            {stale && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                영상을 만든 뒤 편집 내용이 바뀌었습니다. 반영하려면 다시 만들어 주세요.
              </p>
            )}
            <a
              href={`/api/render/${result.renderId}?download=1`}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              MP4 내려받기
            </a>
            <p className="text-xs text-zinc-500">
              틱톡, 유튜브 쇼츠, 인스타그램 릴스에 그대로 올릴 수 있는 크기입니다.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
