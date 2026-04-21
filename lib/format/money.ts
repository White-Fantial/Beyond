/**
 * Money formatting utilities.
 * All monetary values in the system are stored as integer minor units (cents).
 * All amounts are in NZD.
 */

/**
 * Formats a minor-unit integer amount into a display currency string.
 * Examples:
 *   formatMoneyFromMinor(1250) => "$12.50"
 *   formatMoneyFromMinor(0)    => "$0.00"
 */
export function formatMoneyFromMinor(minorUnits: number): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}
