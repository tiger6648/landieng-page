"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { contactNotes, contacts } from "@/db/schema";
import {
  checkAdminPassword,
  createAdminSession,
  deleteAdminSession,
  isAdminAuthenticated,
} from "@/lib/admin-session";
import {
  validateContact,
  type ContactErrors,
  type ContactValues,
} from "@/lib/contact";
import { validateNote } from "@/lib/note";

export type LoginState = { error?: string };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    // 무차별 대입 시도를 늦추기 위한 지연
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: "비밀번호가 올바르지 않습니다." };
  }
  await createAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await deleteAdminSession();
  redirect("/admin/login");
}

// 서버 액션은 직접 호출될 수 있으므로 매번 세션을 확인
export type DeleteContactResult = { ok: true } | { ok: false; error: string };

export async function deleteContact(id: number): Promise<DeleteContactResult> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  if (!Number.isInteger(id)) {
    return { ok: false, error: "잘못된 요청입니다." };
  }

  try {
    await db.delete(contacts).where(eq(contacts.id, id));
  } catch (error) {
    console.error("Failed to delete contact", error);
    return {
      ok: false,
      error: "삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export type UpdateContactResult =
  | { ok: true }
  | { ok: false; errors?: ContactErrors; formError?: string };

export async function updateContact(
  id: number,
  values: ContactValues,
): Promise<UpdateContactResult> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  if (!Number.isInteger(id)) {
    return { ok: false, formError: "잘못된 요청입니다." };
  }

  const input: ContactValues = {
    name: String(values?.name ?? "").trim(),
    phone: String(values?.phone ?? "").trim(),
    email: String(values?.email ?? "").trim(),
    message: String(values?.message ?? "").trim(),
  };
  const errors = validateContact(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  try {
    const updated = await db
      .update(contacts)
      .set(input)
      .where(eq(contacts.id, id))
      .returning({ id: contacts.id });
    if (updated.length === 0) {
      return { ok: false, formError: "이미 삭제된 문의입니다." };
    }
  } catch (error) {
    console.error("Failed to update contact", error);
    return {
      ok: false,
      formError: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export type NoteResult = { ok: true } | { ok: false; error: string };

const NOTE_SAVE_ERROR = "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

// Postgres foreign_key_violation: 메모를 다는 사이 문의가 삭제된 경우
function isForeignKeyViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } })?.cause ?? error;
  return (cause as { code?: string })?.code === "23503";
}

export async function addNote(
  contactId: number,
  body: string,
): Promise<NoteResult> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  if (!Number.isInteger(contactId)) {
    return { ok: false, error: "잘못된 요청입니다." };
  }

  const input = String(body ?? "").trim();
  const error = validateNote(input);
  if (error) return { ok: false, error };

  try {
    await db.insert(contactNotes).values({ contactId, body: input });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      revalidatePath("/admin");
      return { ok: false, error: "이미 삭제된 문의입니다." };
    }
    console.error("Failed to add note", error);
    return { ok: false, error: NOTE_SAVE_ERROR };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function updateNote(
  id: number,
  body: string,
): Promise<NoteResult> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  if (!Number.isInteger(id)) {
    return { ok: false, error: "잘못된 요청입니다." };
  }

  const input = String(body ?? "").trim();
  const error = validateNote(input);
  if (error) return { ok: false, error };

  try {
    const updated = await db
      .update(contactNotes)
      // createdAt과 같은 DB 시계를 써야 "(수정됨)" 판정이 정확함
      .set({ body: input, updatedAt: sql`now()` })
      .where(eq(contactNotes.id, id))
      .returning({ id: contactNotes.id });
    if (updated.length === 0) {
      revalidatePath("/admin");
      return { ok: false, error: "이미 삭제된 메모입니다." };
    }
  } catch (error) {
    console.error("Failed to update note", error);
    return { ok: false, error: NOTE_SAVE_ERROR };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteNote(id: number): Promise<NoteResult> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  if (!Number.isInteger(id)) {
    return { ok: false, error: "잘못된 요청입니다." };
  }

  try {
    await db.delete(contactNotes).where(eq(contactNotes.id, id));
  } catch (error) {
    console.error("Failed to delete note", error);
    return {
      ok: false,
      error: "삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  revalidatePath("/admin");
  return { ok: true };
}
