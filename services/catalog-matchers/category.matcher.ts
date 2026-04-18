/**
 * Category matcher — Phase 3.
 *
 * Scores internal CatalogCategory candidates against an external category entity.
 */

import {
  normalizeName,
  nameSimilarity,
  CONFIDENCE,
  NEEDS_REVIEW_CONFIDENCE_THRESHOLD,
  sortCandidates,
  pickBestCandidate,
} from "./base";
import type { MatchCandidate } from "@/types/catalog-mapping";

export interface ExternalCategoryForMatch {
  externalId: string;
  normalizedName: string | null;
  displayOrder?: number | null;
}

export interface InternalCategoryForMatch {
  id: string;
  name: string;
  originConnectionId?: string | null;
  originExternalRef?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  deletedAt?: Date | null;
}

export interface CategoryMatchResult {
  /** Best single candidate to use for the mapping, or null if ambiguous / no match. */
  best: MatchCandidate | null;
  /** All viable candidates sorted by confidence desc. */
  allCandidates: MatchCandidate[];
}

/**
 * Score all internal categories against one external category and return the
 * best match result.  Pure function — no I/O.
 */
export function matchCategory(
  external: ExternalCategoryForMatch,
  internals: InternalCategoryForMatch[],
  connectionId: string
): CategoryMatchResult {
  const candidates: MatchCandidate[] = [];

  for (const internal of internals) {
    // Skip soft-deleted.
    if (internal.deletedAt) continue;

    // A. Exact originExternalRef match (strongest signal).
    if (
      internal.originExternalRef &&
      internal.originConnectionId === connectionId &&
      internal.originExternalRef === external.externalId
    ) {
      candidates.push({
        internalEntityId: internal.id,
        internalEntityName: internal.name,
        confidence: CONFIDENCE.EXACT_ORIGIN_REF,
        reason: "Exact originExternalRef match",
      });
      continue;
    }

    // B. Normalised name exact match.
    const extNorm = normalizeName(external.normalizedName);
    const intNorm = normalizeName(internal.name);
    if (extNorm && intNorm && extNorm === intNorm) {
      let conf = CONFIDENCE.EXACT_NAME;

      // Bonus for matching display order (small boost).
      if (
        external.displayOrder !== undefined &&
        external.displayOrder !== null &&
        internal.displayOrder !== undefined &&
        internal.displayOrder === external.displayOrder
      ) {
        conf = Math.min(conf + 0.03, 0.95);
      }

      candidates.push({
        internalEntityId: internal.id,
        internalEntityName: internal.name,
        confidence: conf,
        reason: "Exact name match" + (conf > CONFIDENCE.EXACT_NAME ? " + display order" : ""),
      });
      continue;
    }

    // C. Fuzzy name similarity.
    if (extNorm && intNorm) {
      const sim = nameSimilarity(extNorm, intNorm);
      if (sim >= 0.7) {
        candidates.push({
          internalEntityId: internal.id,
          internalEntityName: internal.name,
          confidence: CONFIDENCE.FUZZY_SOLE_CANDIDATE * sim,
          reason: `Fuzzy name match (${Math.round(sim * 100)}%)`,
        });
      }
    }
  }

  const viable = sortCandidates(
    candidates.filter((c) => c.confidence >= NEEDS_REVIEW_CONFIDENCE_THRESHOLD)
  );
  const best = pickBestCandidate(viable);

  return { best, allCandidates: viable };
}
