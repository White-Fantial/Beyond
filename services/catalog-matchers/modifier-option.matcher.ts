/**
 * Modifier-option matcher — Phase 3.
 *
 * Scores internal CatalogModifierOption candidates against an external
 * modifier option entity.  The parent modifier group external ID is used
 * to pre-filter candidates to the correct group, reducing false matches.
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

export interface ExternalModifierOptionForMatch {
  externalId: string;
  normalizedName: string | null;
  normalizedPriceAmount?: number | null;
  /** The external ID of the parent modifier group for scoped matching. */
  groupExternalId?: string | null;
}

export interface InternalModifierOptionForMatch {
  id: string;
  name: string;
  priceDeltaAmount: number;
  modifierGroupId: string;
  originConnectionId?: string | null;
  originExternalRef?: string | null;
  deletedAt?: Date | null;
}

export interface ModifierOptionMatchResult {
  best: MatchCandidate | null;
  allCandidates: MatchCandidate[];
}

/**
 * Score internal modifier options against one external modifier option.
 *
 * @param mappedInternalGroupIds  Set of internal group IDs already confirmed to
 *   correspond to the external option's parent group.  If provided, candidates
 *   in those groups are boosted; candidates outside them are only considered if
 *   the set is empty.
 */
export function matchModifierOption(
  external: ExternalModifierOptionForMatch,
  internals: InternalModifierOptionForMatch[],
  connectionId: string,
  mappedInternalGroupIds?: Set<string>
): ModifierOptionMatchResult {
  const candidates: MatchCandidate[] = [];
  const hasGroupScope = mappedInternalGroupIds && mappedInternalGroupIds.size > 0;

  for (const internal of internals) {
    if (internal.deletedAt) continue;

    const inGroup = hasGroupScope
      ? mappedInternalGroupIds!.has(internal.modifierGroupId)
      : true;

    // A. Exact originExternalRef.
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

    // Skip candidates outside the scoped group unless we have no scope.
    if (!inGroup) continue;

    const extNorm = normalizeName(external.normalizedName);
    const intNorm = normalizeName(internal.name);
    const priceMatch =
      external.normalizedPriceAmount !== undefined &&
      external.normalizedPriceAmount !== null &&
      internal.priceDeltaAmount === external.normalizedPriceAmount;

    if (extNorm && intNorm && extNorm === intNorm && priceMatch) {
      candidates.push({
        internalEntityId: internal.id,
        internalEntityName: internal.name,
        confidence: CONFIDENCE.EXACT_NAME_AND_PRICE,
        reason: "Exact name + price match",
      });
      continue;
    }

    if (extNorm && intNorm && extNorm === intNorm) {
      candidates.push({
        internalEntityId: internal.id,
        internalEntityName: internal.name,
        confidence: CONFIDENCE.EXACT_NAME,
        reason: "Exact name match",
      });
      continue;
    }

    if (extNorm && intNorm) {
      const sim = nameSimilarity(extNorm, intNorm);
      if (sim >= 0.7) {
        const conf = Math.min(
          CONFIDENCE.FUZZY_SOLE_CANDIDATE * sim + (priceMatch ? 0.06 : 0),
          CONFIDENCE.EXACT_NAME - 0.01
        );
        candidates.push({
          internalEntityId: internal.id,
          internalEntityName: internal.name,
          confidence: conf,
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
