"use client";

import { useState } from "react";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "이름을 입력해 주세요.";
  }

  if (!values.email.trim()) {
    errors.email = "이메일을 입력해 주세요.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "올바른 이메일 형식이 아닙니다.";
  }

  if (!values.phone.trim()) {
    errors.phone = "전화번호를 입력해 주세요.";
  } else if (!/^[0-9-+\s()]{9,20}$/.test(values.phone)) {
    errors.phone = "올바른 전화번호 형식이 아닙니다.";
  }

  if (!values.message.trim()) {
    errors.message = "문의내용을 입력해 주세요.";
  }

  return errors;
}

export default function ContactForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormValues]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // TODO: 백엔드 연동 시 여기서 API 호출
    setSubmitted(true);
  }

  function handleReset() {
    setValues(initialValues);
    setErrors({});
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          문의가 접수되었습니다
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          빠른 시일 내에 {values.email}로 답변드리겠습니다.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-6 rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          새 문의 작성
        </button>
      </div>
    );
  }

  const inputClass = (field: keyof FormValues) =>
    `w-full rounded-lg border bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:ring-2 dark:bg-zinc-950 dark:text-zinc-50 ${
      errors[field]
        ? "border-red-500 focus:ring-red-500/30"
        : "border-zinc-300 focus:border-blue-500 focus:ring-blue-500/30 dark:border-zinc-700"
    }`;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Field label="이름" htmlFor="name" error={errors.name}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="홍길동"
          value={values.name}
          onChange={handleChange}
          aria-invalid={!!errors.name}
          className={inputClass("name")}
        />
      </Field>

      <Field label="이메일" htmlFor="email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          value={values.email}
          onChange={handleChange}
          aria-invalid={!!errors.email}
          className={inputClass("email")}
        />
      </Field>

      <Field label="전화번호" htmlFor="phone" error={errors.phone}>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="010-1234-5678"
          value={values.phone}
          onChange={handleChange}
          aria-invalid={!!errors.phone}
          className={inputClass("phone")}
        />
      </Field>

      <Field label="문의내용" htmlFor="message" error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={6}
          placeholder="문의하실 내용을 입력해 주세요."
          value={values.message}
          onChange={handleChange}
          aria-invalid={!!errors.message}
          className={`${inputClass("message")} resize-y`}
        />
      </Field>

      <button
        type="submit"
        className="mt-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        문의하기
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label} <span className="text-red-500">*</span>
      </label>
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
