"use client";

import { useState, useTransition } from "react";
import {
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactValues,
} from "@/lib/contact";
import { updateContact } from "./actions";
import DeleteButton from "./DeleteButton";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

type Props = {
  id: number;
  values: ContactValues;
  createdAtIso: string;
  createdAtLabel: string;
};

export default function ContactItem({
  id,
  values: savedValues,
  createdAtIso,
  createdAtLabel,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ContactValues>(savedValues);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEditing = () => {
    setValues(savedValues);
    setErrors({});
    setFormError(null);
    setEditing(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const field = e.target.name as ContactField;
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    const nextErrors = validateContact(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      const result = await updateContact(id, values);
      if (result.ok) {
        setEditing(false);
        return;
      }
      if (result.errors) setErrors(result.errors);
      if (result.formError) setFormError(result.formError);
    });
  };

  const fieldProps = (field: ContactField) => ({
    id: `${field}-${id}`,
    name: field,
    value: values[field],
    onChange: handleChange,
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${field}-${id}-error` : undefined,
    className: inputClass,
  });

  const time = (
    <time dateTime={createdAtIso} className="text-xs text-zinc-500">
      {createdAtLabel}
    </time>
  );

  if (editing) {
    return (
      <li className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-900 dark:bg-zinc-950 dark:ring-zinc-100">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              문의 수정
            </p>
            {time}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="이름" htmlFor={`name-${id}`} error={errors.name} errorId={`name-${id}-error`}>
              <input {...fieldProps("name")} type="text" maxLength={NAME_MAX_LENGTH} />
            </Field>
            <Field label="전화번호" htmlFor={`phone-${id}`} error={errors.phone} errorId={`phone-${id}-error`}>
              <input {...fieldProps("phone")} type="tel" inputMode="tel" />
            </Field>
            <Field label="이메일" htmlFor={`email-${id}`} error={errors.email} errorId={`email-${id}-error`}>
              <input {...fieldProps("email")} type="email" />
            </Field>
          </div>

          <Field label="문의 내용" htmlFor={`message-${id}`} error={errors.message} errorId={`message-${id}-error`}>
            <textarea
              {...fieldProps("message")}
              rows={5}
              maxLength={MESSAGE_MAX_LENGTH}
              className={`${inputClass} resize-y`}
            />
            <p className="self-end text-xs text-zinc-500">
              {values.message.length} / {MESSAGE_MAX_LENGTH}
            </p>
          </Field>

          {formError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {savedValues.name}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <a href={`tel:${savedValues.phone}`} className="hover:underline">
              {savedValues.phone}
            </a>
            <a
              href={`mailto:${savedValues.email}`}
              className="break-all hover:underline"
            >
              {savedValues.email}
            </a>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {time}
          <button
            type="button"
            onClick={startEditing}
            className="rounded-md px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            수정
          </button>
          <DeleteButton id={id} name={savedValues.name} />
        </div>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800 dark:text-zinc-200">
        {savedValues.message}
      </p>
    </li>
  );
}

function Field({
  label,
  htmlFor,
  error,
  errorId,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  errorId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
      >
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
