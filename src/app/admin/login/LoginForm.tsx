"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "password-error" : undefined}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
        />
        {state.error && (
          <p
            id="password-error"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {state.error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-lg bg-zinc-900 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
