"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_AUDIO,
  DEFAULT_IMAGE_SECONDS,
  EMPTY_PRODUCT,
  MAX_CLIPS,
  MAX_CLIP_SECONDS,
  type AudioSettings,
  type Clip,
  type ProductInfo,
  type StoreSettings,
  type UploadedMedia,
} from "@/lib/clips";
import { uploadFile } from "./upload";
import ClipList from "./ClipList";
import ClipEditor from "./ClipEditor";
import ProductPanel from "./ProductPanel";
import AudioPanel from "./AudioPanel";
import StorePanel from "./StorePanel";
import RenderPanel from "./RenderPanel";

const KEYS = {
  clips: "daege-ad:clips",
  product: "daege-ad:product",
  audio: "daege-ad:audio",
};

type Uploading = { key: string; name: string; progress: number; error?: string };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function loadClips(): Clip[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEYS.clips) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function Editor() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [product, setProduct] = useState<ProductInfo>(EMPTY_PRODUCT);
  const [audio, setAudio] = useState<AudioSettings>(DEFAULT_AUDIO);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // 새로고침해도 작업이 남도록 브라우저에 저장 (원본 파일은 서버의 data/ 폴더에 있음)
  useEffect(() => {
    const saved = loadClips();
    /* eslint-disable react-hooks/set-state-in-effect -- 마운트 후 1회 복원 */
    setClips(saved);
    setProduct(load(KEYS.product, EMPTY_PRODUCT));
    setAudio(load(KEYS.audio, DEFAULT_AUDIO));
    setSelectedId(saved[0]?.id ?? null);
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setStore)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded) save(KEYS.clips, clips);
  }, [clips, loaded]);
  useEffect(() => {
    if (loaded) save(KEYS.product, product);
  }, [product, loaded]);
  useEffect(() => {
    if (loaded) save(KEYS.audio, audio);
  }, [audio, loaded]);

  const selected = clips.find((c) => c.id === selectedId) ?? null;

  const updateClip = (id: string, patch: Partial<Clip>) =>
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const moveClip = (id: string, delta: -1 | 1) =>
    setClips((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const removeClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const applyCaptions = (captions: string[]) =>
    setClips((prev) => prev.map((c, i) => ({ ...c, caption: captions[i] ?? c.caption })));

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_CLIPS - clips.length - uploads.filter((u) => !u.error).length;
    const list = Array.from(files).slice(0, Math.max(0, room));

    // 여러 파일을 고른 순서대로 클립에 넣기 위해 하나씩 올린다
    for (const file of list) {
      const key = crypto.randomUUID();
      setUploads((prev) => [...prev, { key, name: file.name, progress: 0 }]);
      try {
        const media = await uploadFile<UploadedMedia>("/api/media", file, (progress) =>
          setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, progress } : u))),
        );
        const clip: Clip = {
          id: crypto.randomUUID(),
          mediaId: media.mediaId,
          kind: media.kind,
          name: file.name,
          sourceDuration: media.duration,
          start: 0,
          end:
            media.kind === "video"
              ? Math.min(media.duration, MAX_CLIP_SECONDS)
              : DEFAULT_IMAGE_SECONDS,
          caption: "",
        };
        setClips((prev) => [...prev, clip]);
        setSelectedId((cur) => cur ?? clip.id);
        setUploads((prev) => prev.filter((u) => u.key !== key));
      } catch (e) {
        const error = e instanceof Error ? e.message : "업로드 실패";
        setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, error } : u)));
      }
    }
  };

  const clearAll = () => {
    if (!confirm("모든 클립을 지울까요? 이 작업은 되돌릴 수 없습니다.")) return;
    setClips([]);
    setSelectedId(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">대게 광고 영상 만들기</h1>
          <p className="mt-1 text-sm text-zinc-500">
            영상·사진 올리기 → 상품 정보와 자막 → 소리 → 영상 만들기 → 확인 후 승인
          </p>
        </div>
        <div className="flex gap-2">
          {clips.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              전체 지우기
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={clips.length >= MAX_CLIPS}
            className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            영상·사진 올리기
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.m4v,image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <ProductPanel
        product={product}
        onChange={setProduct}
        clips={clips}
        onCaptions={applyCaptions}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ClipList
          clips={clips}
          uploads={uploads}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={moveClip}
          onRemove={removeClip}
          onDismissUpload={(key) => setUploads((prev) => prev.filter((u) => u.key !== key))}
          onDropFiles={handleFiles}
        />
        {selected ? (
          <ClipEditor
            key={selected.id}
            clip={selected}
            index={clips.indexOf(selected)}
            onChange={(patch) => updateClip(selected.id, patch)}
          />
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            {clips.length === 0
              ? "먼저 대게 영상이나 사진을 올려 주세요. 여러 개를 한 번에 고를 수 있습니다."
              : "왼쪽에서 편집할 클립을 고르세요."}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AudioPanel audio={audio} onChange={setAudio} />
        {store && <StorePanel store={store} onSaved={setStore} />}
      </div>

      {store && <RenderPanel clips={clips} audio={audio} store={store} />}
    </div>
  );
}
