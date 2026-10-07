"use client";

import { useState, useTransition } from "react";
import { callAction, UNEXPECTED_ERROR_MESSAGE } from "@/lib/client-error";
import { NOTE_MAX_LENGTH, validateNote } from "@/lib/note";
import { addNote, deleteNote, updateNote } from "./actions";

const textareaClass =
  "w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

const primaryButtonClass =
  "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";

const secondaryButtonClass =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

export type Note = {
  id: number;
  body: string;
  createdAtIso: string;
  createdAtLabel: string;
  edited: boolean;
};

export default function ContactNotes({
  contactId,
  notes,
}: {
  contactId: number;
  notes: Note[];
}) {
  return (
    <section className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        메모 {notes.length > 0 && `${notes.length}`}
      </h3>
      {notes.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}
        </ul>
      )}
      <NoteEditor
        id={`note-new-${contactId}`}
        initialBody=""
        submitLabel="메모 추가"
        placeholder="메모를 입력하세요"
        resetOnSuccess
        onSave={(body) => addNote(contactId, body)}
      />
    </section>
  );
}

function NoteItem({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm("이 메모를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleteError(null);
    startDelete(async () => {
      const result = await callAction(() => deleteNote(note.id));
      if (!result) setDeleteError(UNEXPECTED_ERROR_MESSAGE);
      else if (!result.ok) setDeleteError(result.error);
    });
  };

  if (editing) {
    return (
      <li>
        <NoteEditor
          id={`note-${note.id}`}
          initialBody={note.body}
          submitLabel="저장"
          onSave={(body) => updateNote(note.id, body)}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800 dark:text-zinc-200">
        {note.body}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <time dateTime={note.createdAtIso} className="text-xs text-zinc-500">
          {note.createdAtLabel}
          {note.edited && " (수정됨)"}
        </time>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={isDeleting}
            className="rounded-md px-2 py-0.5 text-xs text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            수정
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-md px-2 py-0.5 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
      {deleteError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {deleteError}
        </p>
      )}
    </li>
  );
}

function NoteEditor({
  id,
  initialBody,
  submitLabel,
  placeholder,
  resetOnSuccess = false,
  onSave,
  onDone,
}: {
  id: string;
  initialBody: string;
  submitLabel: string;
  placeholder?: string;
  resetOnSuccess?: boolean;
  onSave: (body: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDone?: () => void;
}) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    const nextError = validateNote(body);
    setError(nextError ?? null);
    if (nextError) return;

    startTransition(async () => {
      const result = await callAction(() => onSave(body));
      if (!result) {
        setError(UNEXPECTED_ERROR_MESSAGE);
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (resetOnSuccess) setBody("");
      onDone?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-2 flex flex-col gap-2">
      <textarea
        id={id}
        aria-label={submitLabel}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setError(null);
        }}
        rows={2}
        maxLength={NOTE_MAX_LENGTH}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={textareaClass}
      />
      <div className="flex items-center justify-between gap-2">
        {error ? (
          <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            {body.length} / {NOTE_MAX_LENGTH}
          </p>
        )}
        <div className="flex shrink-0 gap-2">
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              disabled={isPending}
              className={secondaryButtonClass}
            >
              취소
            </button>
          )}
          <button type="submit" disabled={isPending} className={primaryButtonClass}>
            {isPending ? "저장 중..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
