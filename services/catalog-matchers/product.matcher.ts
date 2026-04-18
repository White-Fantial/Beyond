/**
 * Product matcher — Phase 3.
 *
 * Scores internal CatalogProduct candidates against an external product entity.
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

export interface ExternalProductForMatch {
  externalId: string;
  normalizedName: string | null;
  normalizedPriceAmount?: number | null;
  externalParentId?: string | null; // external category id
}

export interface InternalProductForMatch {
  id: string;
  name: string;
  basePriceAmount: number;
  originConnectionId?: string | null;
  originExternalRef?: string | null;
  isActive?: boolean;
  deletedAt?: Date | null;
}

export interface ProductMatchResult {
  best: MatchCandidate | null;
  allCandidates: MatchCandidate[];
}

/**
 * Score internal products against a single external product.  Pure function.
 */
export function matchProduct(
  external: ExternalProductForMatch,
  internals: InternalProductForMatch[],
  connectionId: string
): ProductMatchResult {
  const candidates: MatchCandidate[] = [];

  for (const internal of internals) {
    if (internal.deletedAt) continue;

    // A. Exact originExternalRef match.
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

    const extNorm = normalizeName(external.normalizedName);
    const intNorm = normalizeName(internal.name);
    const priceMatch =
      external.normalizedPriceAmount !== undefined &&
      external.normalizedPriceAmount !== null &&
      internal.basePriceAmount === external.normalizedPriceAmount;

    // B. Exact name + price match.
    if (extNorm && intNorm && extNorm === intNorm && priceMatch) {
      candidates.push({
        internalEntityId: internal.id,
        internalEntityName: internal.name,
        confidence: CONFIDENCE.EXACT_NAME_AND_PRICE,
        reason: "Exact name + price match",
      });
      continue;
    }

    // C. Exact name only.
    if (extNorm && intNorm && extNorm === intNorm) {
      candidates.push({
        internalEntityId: internal.id,
        internalEntityName: internal.name,
        confidence: CONFIDENCE.EXACT_NAME,
        reason: "Exact name match",
      });
      continue;
    }

    // D. Fuzzy name + price.
    if (extNorm && intNorm) {
      const sim = nameSimilarity(extNorm, intNorm);
      if (sim >= 0.7) {
        const baseConf = CONFIDENCE.FUZZY_SOLE_CANDIDATE * sim;
        const bonusConf = priceMatch ? 0.08 : 0;
        candidates.push({
          internalEntityId: internal.id,
          internalEntityName: internal.name,
          confidence: Math.min(baseConf + bonusConf, CONFIDENCE.EXACT_NAME - 0.01),
          reason: `Fuzzy name (${Math.round(sim * 100)}%)${priceMatch ? " + price match" : ""}`,
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
