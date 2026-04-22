/**
 * Formats a modifier group's selection range as a human-readable string.
 * Examples: "Any", "1–3", "1–∞"
 */
export function formatSelectionRange(selectionMin: number, selectionMax: number | null): string {
  if (selectionMin === 0 && !selectionMax) return "Any";
  return `${selectionMin}–${selectionMax ?? "∞"}`;
}

/**
 * Formats a price delta in millicents (1/100000 dollar) as a display string.
 * Examples: "Free", "+$1.00", "-$0.50"
 */
export function formatPriceDelta(amount: number): string {
  if (amount === 0) return "Free";
  const sign = amount > 0 ? "+" : "";
  return `${sign}$${(Math.abs(amount) / 100000).toFixed(2)}`;
}
