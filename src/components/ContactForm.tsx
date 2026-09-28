"use client";

import { useState } from "react";

type ContactField = "name" | "phone" | "email" | "message";
type Values = Record<ContactField, string>;
type Errors = Partial<Record<ContactField, string>>;

const emptyValues: Values = { name: "", phone: "", email: "", message: "" };

const PHONE_PATTERN = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX_LENGTH = 2000;

function validate(values: Values): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  const phone = values.phone.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = "이름을 입력해 주세요.";

  if (!phone) errors.phone = "전화번호를 입력해 주세요.";
  else if (!PHONE_PATTERN.test(phone))
    errors.phone = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)";

  if (!email) errors.email = "이메일을 입력해 주세요.";
  else if (!EMAIL_PATTERN.test(email))
    errors.email = "올바른 이메일 형식이 아닙니다.";

  if (!message) errors.message = "문의 내용을 입력해 주세요.";

  return errors;
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

export default function ContactForm() {
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const field = e.target.name as ContactField;
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // 백엔드 연동 전: 화면 확인용으로 완료 메시지만 표시
    setSubmitted(true);
    setValues(emptyValues);
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

      <button
        type="submit"
        className="h-12 rounded-lg bg-zinc-900 font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        문의하기
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
