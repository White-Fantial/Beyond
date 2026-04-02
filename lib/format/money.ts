/**
 * Money formatting utilities.
 * All monetary values in the system are stored as integer minor units
 * (e.g. cents for NZD/USD, pence for GBP).
 */

/**
 * Formats a minor-unit integer amount into a display currency string.
 * Examples:
 *   formatMoneyFromMinor(1250, "NZD") => "$12.50"
 *   formatMoneyFromMinor(0, "NZD")    => "$0.00"
 */
export function formatMoneyFromMinor(
  minorUnits: number,
  currencyCode: string
): string {
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    // Fallback for unsupported currency codes
    return `${currencyCode} ${major.toFixed(2)}`;
  }
}
