import { asc, desc, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { contactNotes, contacts } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { logout } from "./actions";
import ContactItem from "./ContactItem";
import type { Note } from "./ContactNotes";

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

  // 문의별로 따로 조회하지 않고 한 번에 가져와 묶음 (작성순)
  const noteRows =
    rows.length === 0
      ? []
      : await db
          .select()
          .from(contactNotes)
          .where(
            inArray(
              contactNotes.contactId,
              rows.map((row) => row.id),
            ),
          )
          .orderBy(asc(contactNotes.createdAt), asc(contactNotes.id));

  const notesByContact = new Map<number, Note[]>();
  for (const note of noteRows) {
    const list = notesByContact.get(note.contactId) ?? [];
    list.push({
      id: note.id,
      body: note.body,
      createdAtIso: note.createdAt.toISOString(),
      createdAtLabel: dateFormatter.format(note.createdAt),
      edited: note.updatedAt.getTime() > note.createdAt.getTime(),
    });
    notesByContact.set(note.contactId, list);
  }

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
              <ContactItem
                key={row.id}
                id={row.id}
                values={{
                  name: row.name,
                  phone: row.phone,
                  email: row.email,
                  message: row.message,
                }}
                createdAtIso={row.createdAt.toISOString()}
                createdAtLabel={dateFormatter.format(row.createdAt)}
                notes={notesByContact.get(row.id) ?? []}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
