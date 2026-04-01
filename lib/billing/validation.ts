export function validatePlanCode(code: string): string | null {
  if (!code || code.trim().length === 0) return "Plan code는 필수입니다.";
  if (!/^[a-z0-9_-]+$/.test(code)) return "Plan code는 소문자, 숫자, 언더스코어, 하이픈만 허용됩니다.";
  if (code.length > 50) return "Plan code는 50자 이하여야 합니다.";
  return null;
}

export function validatePriceAmount(amount: number): string | null {
  if (amount < 0) return "가격은 0 이상이어야 합니다.";
  if (!Number.isInteger(amount)) return "가격은 정수(minor units)로 입력해야 합니다.";
  return null;
}

export function validateExtensionDays(days: number): string | null {
  if (!Number.isInteger(days) || days < 1) return "연장일은 1일 이상의 정수여야 합니다.";
  if (days > 365) return "연장일은 최대 365일입니다.";
  return null;
}

export function validateBillingEmail(email: string): string | null {
  if (!email || email.trim().length === 0) return "이메일은 필수입니다.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "유효한 이메일 형식이 아닙니다.";
  return null;
}
