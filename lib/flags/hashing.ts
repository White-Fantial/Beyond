/**
 * Deterministic hash for percentage-based rollout.
 * Returns a stable number in [0, 100) for the same input string, ensuring
 * that a given user/tenant always lands in the same percentage bucket across
 * evaluations. This guarantees consistent flag variants for the same entity.
 */
export function hashToPercentage(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}
