export const NOTE_MAX_LENGTH = 1000;

// 클라이언트(즉시 피드백)와 서버 액션(최종 검증)에서 함께 사용
export function validateNote(body: string): string | undefined {
  const value = body.trim();
  if (!value) return "메모 내용을 입력해 주세요.";
  if (value.length > NOTE_MAX_LENGTH)
    return `메모는 ${NOTE_MAX_LENGTH}자 이내로 입력해 주세요.`;
  return undefined;
}
