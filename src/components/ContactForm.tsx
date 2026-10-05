"use client";

import { useState, useTransition } from "react";
import posthog from "posthog-js";
import { submitContact } from "@/app/actions";
import {
  MESSAGE_MAX_LENGTH,
  validateContact,
  type ContactErrors as Errors,
  type ContactField,
  type ContactValues as Values,
} from "@/lib/contact";

const emptyValues: Values = { name: "", phone: "", email: "", message: "" };

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

export default function ContactForm() {
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const field = e.target.name as ContactField;
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitted(false);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    const nextErrors = validateContact(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) {
      // 입력값(개인정보)은 보내지 않고 오류난 필드 이름만 기록
      posthog.capture("contact_form_invalid", {
        fields: Object.keys(nextErrors),
      });
      return;
    }

    // 서버 액션으로 DB(contacts 테이블)에 저장
    startTransition(async () => {
      const result = await submitContact(values);
      if (result.ok) {
        posthog.capture("contact_form_submitted");
        setSubmitted(true);
        setValues(emptyValues);
        return;
      }
      if (result.errors) setErrors(result.errors);
      if (result.formError) setFormError(result.formError);
    });
  };

  const fieldProps = (field: ContactField) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: handleChange,
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
    className: inputClass,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Field label="이름" field="name" error={errors.name}>
        <input
          {...fieldProps("name")}
          type="text"
          autoComplete="name"
          placeholder="홍길동"
          maxLength={50}
          required
        />
      </Field>

      <Field label="전화번호" field="phone" error={errors.phone}>
        <input
          {...fieldProps("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="010-1234-5678"
          required
        />
      </Field>

      <Field label="이메일" field="email" error={errors.email}>
        <input
          {...fieldProps("email")}
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          required
        />
      </Field>

      <Field label="문의 내용" field="message" error={errors.message}>
        <textarea
          {...fieldProps("message")}
          rows={6}
          placeholder="문의하실 내용을 자유롭게 작성해 주세요."
          maxLength={MESSAGE_MAX_LENGTH}
          required
          className={`${inputClass} resize-y`}
        />
        <p className="self-end text-xs text-zinc-500">
          {values.message.length} / {MESSAGE_MAX_LENGTH}
        </p>
      </Field>

      {submitted && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          문의가 정상적으로 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.
        </p>
      )}

      {formError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-lg bg-zinc-900 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? "전송 중..." : "문의하기"}
      </button>
    </form>
  );
}

function Field({
  label,
  field,
  error,
  children,
}: {
  label: string;
  field: ContactField;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={field}
        className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        {label} <span className="text-red-500">*</span>
      </label>
      {children}
      {error && (
        <p id={`${field}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
