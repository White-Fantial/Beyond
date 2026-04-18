/**
 * Catalog matcher base utilities — Phase 3.
 *
 * Shared helpers used by all entity-type-specific matchers.
 * All logic here is purely functional and deterministic (no I/O).
 */

import type { MatchCandidate } from "@/types/catalog-mapping";

// ─── String normalisation ─────────────────────────────────────────────────────

/**
 * Normalise a display name for comparison:
 * lowercase, trim whitespace, collapse multiple spaces, strip punctuation
 * that varies by provider (hyphens, apostrophes, etc.).
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[''`]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
}

// ─── Confidence thresholds ────────────────────────────────────────────────────

export const CONFIDENCE = {
  /** External ID exactly matches originExternalRef — near-certain. */
  EXACT_ORIGIN_REF: 0.98,
  /** Normalised name + price are both exact. */
  EXACT_NAME_AND_PRICE: 0.9,
  /** Normalised name exact match only. */
  EXACT_NAME: 0.8,
  /** Single fuzzy-only candidate with no competing alternatives. */
  FUZZY_SOLE_CANDIDATE: 0.65,
  /** Multiple ambiguous candidates — too uncertain to auto-link. */
  AMBIGUOUS: 0.55,
  /** No viable candidate found. */
  NO_MATCH: 0,
};

/** Minimum confidence to auto-promote a mapping to ACTIVE status. */
export const ACTIVE_CONFIDENCE_THRESHOLD = CONFIDENCE.EXACT_ORIGIN_REF;

/** Minimum confidence to auto-create a NEEDS_REVIEW mapping. */
export const NEEDS_REVIEW_CONFIDENCE_THRESHOLD = CONFIDENCE.FUZZY_SOLE_CANDIDATE;

// ─── Candidate sorting ────────────────────────────────────────────────────────

/** Sort MatchCandidate[] descending by confidence. */
export function sortCandidates(candidates: MatchCandidate[]): MatchCandidate[] {
  return [...candidates].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Pick the best candidate if it is clearly dominant (no close second).
 * Returns null when there are multiple close candidates (ambiguous).
 */
export function pickBestCandidate(candidates: MatchCandidate[]): MatchCandidate | null {
  if (candidates.length === 0) return null;
  const sorted = sortCandidates(candidates);
  const best = sorted[0];
  if (sorted.length === 1) return best;
  const runner = sorted[1];
  // If the runner-up is within 0.05 of the best, treat as ambiguous.
  if (best.confidence - runner.confidence < 0.05) return null;
  return best;
}

// ─── Fuzzy similarity (simple character overlap) ─────────────────────────────

/**
 * A simple but deterministic similarity measure.
 * Returns a score in [0, 1] using the Sørensen–Dice coefficient on bigrams.
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);
  const setA = new Map<string, number>();
  for (const bg of bigramsA) setA.set(bg, (setA.get(bg) ?? 0) + 1);

  let intersection = 0;
  const tmpB = new Map<string, number>();
  for (const bg of bigramsB) tmpB.set(bg, (tmpB.get(bg) ?? 0) + 1);
  for (const [bg, countB] of tmpB) {
    const countA = setA.get(bg) ?? 0;
    intersection += Math.min(countA, countB);
  }

  return (2 * intersection) / (bigramsA.length + bigramsB.length);
}

function bigrams(str: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    result.push(str.slice(i, i + 2));
  }
  return result;
}
