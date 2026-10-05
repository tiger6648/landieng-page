"use client";

import { useRef } from "react";
import {
  clipDuration,
  formatSeconds,
  MAX_CAPTION_LENGTH,
  MAX_CLIP_SECONDS,
  MIN_CLIP_SECONDS,
  type Clip,
} from "@/lib/clips";
import CaptionOverlay from "./CaptionOverlay";

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function ClipEditor({
  clip,
  index,
  onChange,
}: {
  clip: Clip;
  index: number;
  onChange: (patch: Partial<Clip>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = `/api/media/${clip.mediaId}`;

  const seek = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
  };

  const setStart = (value: number) => {
    const start = round1(Math.min(Math.max(0, value), clip.end - MIN_CLIP_SECONDS));
    // 최대 길이를 넘으면 끝 지점을 따라 당긴다
    const end = Math.min(clip.end, start + MAX_CLIP_SECONDS);
    onChange({ start, end });
    seek(start);
  };

  const setEnd = (value: number) => {
    const end = round1(Math.max(Math.min(clip.sourceDuration, value), clip.start + MIN_CLIP_SECONDS));
    const start = Math.max(clip.start, end - MAX_CLIP_SECONDS);
    onChange({ start, end });
    seek(end);
  };

  const currentTime = () => videoRef.current?.currentTime ?? 0;

  return (
    <section
      aria-label={`${index + 1}번 클립 편집`}
      className="grid gap-6 rounded-xl border border-zinc-200 p-4 md:grid-cols-[minmax(0,320px)_1fr] dark:border-zinc-800"
    >
      {/* 9:16 미리보기. 완성 영상과 같은 비율로 자르고 자막 위치도 맞춘다 */}
      <div className="@container relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-lg bg-black">
        {clip.kind === "video" ? (
          <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={() => seek(clip.start)}
            onTimeUpdate={(e) => {
              // 고른 구간만 반복 재생
              const v = e.currentTarget;
              if (!v.paused && v.currentTime >= clip.end) v.currentTime = clip.start;
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- 로컬 업로드 미리보기
          <img src={src} alt={clip.name} className="h-full w-full object-cover" />
        )}
        <CaptionOverlay text={clip.caption} />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold">{index + 1}번 클립</h2>
          <p className="truncate text-sm text-zinc-500">{clip.name}</p>
        </div>

        {clip.kind === "video" ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 text-sm font-medium">
              사용할 구간 · {formatSeconds(clipDuration(clip))}
              <span className="text-zinc-500"> / 원본 {formatSeconds(clip.sourceDuration)}</span>
            </legend>
            <RangeRow
              label="시작"
              value={clip.start}
              max={clip.sourceDuration}
              onChange={setStart}
            />
            <RangeRow label="끝" value={clip.end} max={clip.sourceDuration} onChange={setEnd} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStart(currentTime())}
                className="h-9 rounded-lg border border-zinc-300 px-3 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                지금 위치를 시작으로
              </button>
              <button
                type="button"
                onClick={() => setEnd(currentTime())}
                className="h-9 rounded-lg border border-zinc-300 px-3 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                지금 위치를 끝으로
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              미리보기를 재생하면 고른 구간만 반복됩니다. 한 클립은 최대 {MAX_CLIP_SECONDS}초입니다.
            </p>
          </fieldset>
        ) : (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              보여 줄 시간 · {formatSeconds(clipDuration(clip))}
            </legend>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={clip.end}
              onChange={(e) => onChange({ start: 0, end: Number(e.target.value) })}
              aria-label="사진을 보여 줄 시간(초)"
              className="w-full accent-sky-600"
            />
          </fieldset>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="caption" className="text-sm font-medium">
            자막
          </label>
          <textarea
            id="caption"
            rows={3}
            value={clip.caption}
            maxLength={MAX_CAPTION_LENGTH}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder={"예) 오늘 새벽 경매한\n산지 직송 대게"}
            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="flex justify-between text-xs text-zinc-500">
            <span>Enter로 줄을 바꿀 수 있습니다. 두 줄 이내가 읽기 좋습니다.</span>
            <span>
              {clip.caption.length} / {MAX_CAPTION_LENGTH}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

function RangeRow({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid grid-cols-[2.5rem_1fr_4rem] items-center gap-3 text-sm">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-600"
      />
      <span className="text-right tabular-nums text-zinc-600 dark:text-zinc-400">
        {formatSeconds(value)}
      </span>
    </label>
  );
}
