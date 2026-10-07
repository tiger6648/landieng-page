"use server";

import { db } from "@/db";
import { contacts } from "@/db/schema";
import {
  validateContact,
  type ContactErrors,
  type ContactValues,
} from "@/lib/contact";
import { notifyAdminOfContact } from "@/lib/notify";

export type SubmitContactResult =
  | { ok: true }
  | { ok: false; errors?: ContactErrors; formError?: string };

export async function submitContact(
  values: ContactValues,
): Promise<SubmitContactResult> {
  // 서버 액션은 폼을 거치지 않고 직접 호출될 수 있으므로 다시 검증
  const input: ContactValues = {
    name: String(values?.name ?? "").trim(),
    phone: String(values?.phone ?? "").trim(),
    email: String(values?.email ?? "").trim(),
    message: String(values?.message ?? "").trim(),
  };
  const errors = validateContact(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  let createdAt: Date;
  try {
    [{ createdAt }] = await db
      .insert(contacts)
      .values(input)
      .returning({ createdAt: contacts.createdAt });
  } catch (error) {
    console.error("Failed to save contact", error);
    return {
      ok: false,
      formError:
        "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  await notifyAdminOfContact(input, createdAt);
  return { ok: true };
}
