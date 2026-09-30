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
