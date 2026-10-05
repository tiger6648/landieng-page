"use client";

import { useEffect, useRef, useState } from "react";
import { formatSeconds, type AudioSettings, type MusicTrack } from "@/lib/clips";
import { uploadFile } from "./upload";

export default function AudioPanel({
  audio,
  onChange,
}: {
  audio: AudioSettings;
  onChange: (a: AudioSettings) => void;
}) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/music")
      .then((r) => r.json())
      .then((list: MusicTrack[]) => {
        if (alive) setTracks(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 선택한 음악이 목록에서 사라졌으면(다른 곳에서 삭제 등) 선택을 푼다
  const selected = tracks.find((t) => t.musicId === audio.musicId) ?? null;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const track = await uploadFile<MusicTrack>("/api/music", file);
      setTracks((prev) => [...prev, track]);
      onChange({ ...audio, musicId: track.musicId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (track: MusicTrack) => {
    if (!confirm(`"${track.name}" 음악을 목록에서 지울까요?`)) return;
    await fetch(`/api/music/${track.musicId}`, { method: "DELETE" });
    setTracks((prev) => prev.filter((t) => t.musicId !== track.musicId));
    if (audio.musicId === track.musicId) onChange({ ...audio, musicId: null });
  };

  return (
    <section
      aria-label="소리"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div>
        <h2 className="text-lg font-semibold">소리</h2>
        <p className="text-sm text-zinc-500">
          상업적으로 써도 되는 무료 음원만 올려 주세요. (예: 유튜브 오디오 보관함)
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">배경 음악</legend>
        <TrackOption
          label="음악 없음"
          checked={audio.musicId === null || !selected}
          onSelect={() => onChange({ ...audio, musicId: null })}
        />
        {tracks.map((t) => (
          <TrackOption
            key={t.musicId}
            label={`${t.name} · ${formatSeconds(t.duration)}`}
            checked={audio.musicId === t.musicId}
            onSelect={() => onChange({ ...audio, musicId: t.musicId })}
            onRemove={() => remove(t)}
          />
        ))}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="h-9 rounded-lg border border-zinc-300 px-3 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {uploading ? "올리는 중..." : "음악 파일 올리기"}
          </button>
          <span className="text-xs text-zinc-500">mp3, m4a, wav · 50MB 이하</span>
          <input
            ref={fileInput}
            type="file"
            accept=".mp3,.m4a,.aac,.wav,.ogg,audio/*"
            hidden
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </fieldset>

      {selected && (
        <div className="flex flex-col gap-2">
          <audio key={selected.musicId} src={`/api/music/${selected.musicId}`} controls className="w-full" />
          <VolumeRow
            label="음악 음량"
            value={audio.musicVolume}
            onChange={(v) => onChange({ ...audio, musicVolume: v })}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={audio.keepOriginal}
            onChange={(e) => onChange({ ...audio, keepOriginal: e.target.checked })}
            className="h-4 w-4 accent-sky-600"
          />
          촬영 영상의 원래 소리 넣기
        </label>
        {audio.keepOriginal && (
          <VolumeRow
            label="원래 소리 음량"
            value={audio.originalVolume}
            onChange={(v) => onChange({ ...audio, originalVolume: v })}
          />
        )}
        <p className="text-xs text-zinc-500">
          대게 찌는 소리처럼 현장감 있는 소리는 살리고, 잡음이 많으면 끄세요.
        </p>
      </div>
    </section>
  );
}

function TrackOption({
  label,
  checked,
  onSelect,
  onRemove,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-1">
      <label className="flex min-w-0 items-center gap-2 text-sm">
        <input
          type="radio"
          name="music"
          checked={checked}
          onChange={onSelect}
          className="h-4 w-4 accent-sky-600"
        />
        <span className="truncate">{label}</span>
      </label>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-xs text-zinc-500 hover:text-red-600 hover:underline"
        >
          지우기
        </button>
      )}
    </div>
  );
}

function VolumeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-600"
      />
      <span className="text-right tabular-nums text-zinc-600 dark:text-zinc-400">
        {Math.round(value * 100)}%
      </span>
    </label>
  );
}
