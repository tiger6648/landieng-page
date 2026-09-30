"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { contacts } from "@/db/schema";
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
export async function deleteContact(id: number): Promise<void> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  if (!Number.isInteger(id)) return;

  await db.delete(contacts).where(eq(contacts.id, id));
  revalidatePath("/admin");
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
