"use client";

import { useState } from "react";
import { clipDuration, formatSeconds, type Clip } from "@/lib/clips";

type Uploading = { key: string; name: string; progress: number; error?: string };

export default function ClipList({
  clips,
  uploads,
  selectedId,
  onSelect,
  onMove,
  onRemove,
  onDismissUpload,
  onDropFiles,
}: {
  clips: Clip[];
  uploads: Uploading[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
  onDismissUpload: (key: string) => void;
  onDropFiles: (files: FileList) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <section
      aria-label="클립 목록"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDropFiles(e.dataTransfer.files);
      }}
      className={`flex flex-col gap-2 rounded-xl border p-3 ${
        dragOver
          ? "border-sky-500 bg-sky-50 dark:bg-sky-950"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <h2 className="px-1 text-sm font-semibold">클립 ({clips.length})</h2>

      {clips.length === 0 && uploads.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-zinc-500">
          여기에 파일을 끌어다 놓아도 됩니다.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {clips.map((clip, i) => {
          const active = clip.id === selectedId;
          return (
            <li key={clip.id}>
              <div
                className={`flex items-center gap-2 rounded-lg border p-2 ${
                  active
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-950"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(clip.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-current={active}
                >
                  <Thumb clip={clip} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {i + 1}. {clip.caption.trim() || clip.name}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {clip.kind === "video" ? "영상" : "사진"} · {formatSeconds(clipDuration(clip))}
                      {!clip.caption.trim() && " · 자막 없음"}
                    </span>
                  </span>
                </button>
                <div className="flex flex-col">
                  <IconButton label="위로" disabled={i === 0} onClick={() => onMove(clip.id, -1)}>
                    ▲
                  </IconButton>
                  <IconButton
                    label="아래로"
                    disabled={i === clips.length - 1}
                    onClick={() => onMove(clip.id, 1)}
                  >
                    ▼
                  </IconButton>
                </div>
                <IconButton label="삭제" onClick={() => onRemove(clip.id)}>
                  ✕
                </IconButton>
              </div>
            </li>
          );
        })}
      </ol>

      {uploads.map((u) => (
        <div
          key={u.key}
          className="rounded-lg border border-dashed border-zinc-300 p-2 text-xs dark:border-zinc-700"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{u.name}</span>
            {u.error && (
              <button
                type="button"
                onClick={() => onDismissUpload(u.key)}
                className="shrink-0 text-zinc-500 hover:underline"
              >
                닫기
              </button>
            )}
          </div>
          {u.error ? (
            <p className="mt-1 text-red-600">{u.error}</p>
          ) : (
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-sky-500 transition-[width]"
                style={{ width: `${Math.round(u.progress * 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function Thumb({ clip }: { clip: Clip }) {
  const src = `/api/media/${clip.mediaId}`;
  return (
    <span className="relative block h-14 w-8 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
      {clip.kind === "video" ? (
        <video
          src={`${src}#t=${clip.start + 0.1}`}
          muted
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 로컬 업로드 미리보기
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-[10px] text-zinc-500 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
