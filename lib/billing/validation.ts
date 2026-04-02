export function validatePlanCode(code: string): string | null {
  if (!code || code.trim().length === 0) return "Plan code는 필수입니다.";
  if (!/^[a-z0-9_-]+$/.test(code)) return "Plan code는 Lowercase letters, numbers, underscores, and hyphens only됩니다.";
  if (code.length > 50) return "Plan code는 50자 이하여야 합니다.";
  return null;
}

export function validatePriceAmount(amount: number): string | null {
  if (amount < 0) return "Price은 0 이상이어야 합니다.";
  if (!Number.isInteger(amount)) return "Price은 Integer(minor units)로 입력해야 합니다.";
  return null;
}

export function validateExtensionDays(days: number): string | null {
  if (!Number.isInteger(days) || days < 1) return "연장일은 1일 이상의 Integer여야 합니다.";
  if (days > 365) return "연장일은 최대 365일입니다.";
  return null;
}

export function validateBillingEmail(email: string): string | null {
  if (!email || email.trim().length === 0) return "Email은 필수입니다.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "유효한 Email 형식이 아닙니다.";
  return null;
}
