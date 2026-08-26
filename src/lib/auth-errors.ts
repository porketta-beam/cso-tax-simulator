/**
 * Supabase 인증 오류 → 사용자에게 보여줄 한국어 문장
 *
 * supabase-js 는 최근 오류에 안정적인 `code` 를 붙이지만 모든 오류가 그런 것은
 * 아니다. 그래서 코드로 먼저 맞추고, 없으면 메시지 문자열로 되짚는다. 어느
 * 쪽에도 걸리지 않으면 원문(영어)을 그대로 노출하지 않고 기본 문장을 쓴다.
 */
const BY_CODE: Record<string, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다",
  email_not_confirmed: "이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인하세요",
  user_already_exists: "이미 가입된 이메일입니다",
  email_exists: "이미 가입된 이메일입니다",
  weak_password: "비밀번호는 6자 이상이어야 합니다",
  over_request_rate_limit: "요청이 너무 잦습니다. 잠시 후 다시 시도하세요",
  over_email_send_rate_limit: "요청이 너무 잦습니다. 잠시 후 다시 시도하세요",
};

const BY_MESSAGE: readonly (readonly [RegExp, string])[] = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/already registered|already exists/i, BY_CODE.user_already_exists],
  [/password should be at least|weak password/i, BY_CODE.weak_password],
  [/rate limit|too many requests/i, BY_CODE.over_request_rate_limit],
];

const FALLBACK = "로그인 처리 중 문제가 생겼습니다";

export function authErrorMessage(error: unknown): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (code && BY_CODE[code]) return BY_CODE[code];
  for (const [pattern, text] of BY_MESSAGE) {
    if (message && pattern.test(message)) return text;
  }
  return FALLBACK;
}
