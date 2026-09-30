import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { logout } from "./actions";
import DeleteButton from "./DeleteButton";

export const metadata: Metadata = {
  title: "문의 관리",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const rows = await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.createdAt));

  return (
    <div className="flex-1 bg-zinc-50 px-4 py-10 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              문의 관리
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              총 {rows.length}건 · 최신순
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              로그아웃
            </button>
          </form>
        </header>

        {rows.length === 0 ? (
          <p className="rounded-2xl bg-white p-10 text-center text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
            아직 접수된 문의가 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {row.name}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <a href={`tel:${row.phone}`} className="hover:underline">
                        {row.phone}
                      </a>
                      <a
                        href={`mailto:${row.email}`}
                        className="break-all hover:underline"
                      >
                        {row.email}
                      </a>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <time
                      dateTime={row.createdAt.toISOString()}
                      className="text-xs text-zinc-500"
                    >
                      {dateFormatter.format(row.createdAt)}
                    </time>
                    <DeleteButton id={row.id} name={row.name} />
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                  {row.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
