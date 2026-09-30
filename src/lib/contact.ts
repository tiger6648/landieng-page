export type ContactField = "name" | "phone" | "email" | "message";
export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string>>;

const PHONE_PATTERN = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;
export const MESSAGE_MAX_LENGTH = 2000;

// 클라이언트(즉시 피드백)와 서버 액션(최종 검증)에서 함께 사용
export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const name = values.name.trim();
  const phone = values.phone.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = "이름을 입력해 주세요.";
  else if (name.length > NAME_MAX_LENGTH)
    errors.name = `이름은 ${NAME_MAX_LENGTH}자 이내로 입력해 주세요.`;

  if (!phone) errors.phone = "전화번호를 입력해 주세요.";
  else if (!PHONE_PATTERN.test(phone))
    errors.phone = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)";

  if (!email) errors.email = "이메일을 입력해 주세요.";
  else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email))
    errors.email = "올바른 이메일 형식이 아닙니다.";

  if (!message) errors.message = "문의 내용을 입력해 주세요.";
  else if (message.length > MESSAGE_MAX_LENGTH)
    errors.message = `문의 내용은 ${MESSAGE_MAX_LENGTH}자 이내로 입력해 주세요.`;

  return errors;
}
