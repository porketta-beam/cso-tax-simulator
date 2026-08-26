/**
 * 비밀번호 변경 폼 검증 (기능정의 v2 §3 S1)
 *
 * 하한 6자는 Supabase 기본 정책과 맞춘 값이다. 서버에 물어보고 나서야 "너무
 * 짧다"는 답을 받으면 사용자는 왕복 한 번을 헛되이 기다린다 — 여기서 먼저
 * 걸러내되, 최종 판단은 어차피 서버가 한다(`weak_password` → `authErrorMessage`).
 *
 * 통과하면 null. 문제가 있으면 그대로 화면에 띄울 한국어 문장을 돌려준다.
 */
export const PASSWORD_MIN_LENGTH = 6;

export function validatePassword(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`;
  }
  if (password !== confirm) return "두 비밀번호가 일치하지 않습니다";
  return null;
}
