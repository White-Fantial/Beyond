export function validatePlanCode(code: string): string | null {
  if (!code || code.trim().length === 0) return "Plan code is required.";
  if (!/^[a-z0-9_-]+$/.test(code)) return "Plan code must contain only lowercase letters, numbers, underscores, and hyphens.";
  if (code.length > 50) return "Plan code must be 50 characters or fewer.";
  return null;
}

export function validatePriceAmount(amount: number): string | null {
  if (amount < 0) return "Price must be 0 or greater.";
  if (!Number.isInteger(amount)) return "Price must be an integer (minor units).";
  return null;
}

export function validateExtensionDays(days: number): string | null {
  if (!Number.isInteger(days) || days < 1) return "Extension days must be an integer of at least 1.";
  if (days > 365) return "Extension days cannot exceed 365.";
  return null;
}

export function validateBillingEmail(email: string): string | null {
  if (!email || email.trim().length === 0) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format.";
  return null;
}
