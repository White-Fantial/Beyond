/**
 * Modifier-group matcher — Phase 3.
 *
 * Scores internal CatalogModifierGroup candidates against an external
 * modifier group entity.
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

export interface ExternalModifierGroupForMatch {
  externalId: string;
  normalizedName: string | null;
  minSelect?: number | null;
  maxSelect?: number | null;
  isRequired?: boolean | null;
}

export interface InternalModifierGroupForMatch {
  id: string;
  name: string;
  selectionMin: number;
  selectionMax: number | null;
  isRequired: boolean;
  originConnectionId?: string | null;
  originExternalRef?: string | null;
  deletedAt?: Date | null;
}

export interface ModifierGroupMatchResult {
  best: MatchCandidate | null;
  allCandidates: MatchCandidate[];
}

export function matchModifierGroup(
  external: ExternalModifierGroupForMatch,
  internals: InternalModifierGroupForMatch[],
  connectionId: string
): ModifierGroupMatchResult {
  const candidates: MatchCandidate[] = [];

  for (const internal of internals) {
    if (internal.deletedAt) continue;

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

    const extNorm = normalizeName(external.normalizedName);
    const intNorm = normalizeName(internal.name);

    const minMatch =
      external.minSelect !== undefined &&
      external.minSelect !== null &&
      internal.selectionMin === external.minSelect;
    const maxMatch =
      external.maxSelect !== undefined &&
      external.maxSelect !== null &&
      internal.selectionMax === external.maxSelect;
    const reqMatch =
      external.isRequired !== undefined &&
      external.isRequired !== null &&
      internal.isRequired === external.isRequired;

    if (extNorm && intNorm && extNorm === intNorm) {
      let conf = CONFIDENCE.EXACT_NAME;
      const reasons = ["Exact name"];
      if (minMatch) { conf = Math.min(conf + 0.03, 0.92); reasons.push("min match"); }
      if (maxMatch) { conf = Math.min(conf + 0.02, 0.92); reasons.push("max match"); }
      if (reqMatch) { conf = Math.min(conf + 0.02, 0.92); reasons.push("required match"); }
      candidates.push({
        internalEntityId: internal.id,
        internalEntityName: internal.name,
        confidence: conf,
        reason: reasons.join(" + "),
      });
      continue;
    }

    if (extNorm && intNorm) {
      const sim = nameSimilarity(extNorm, intNorm);
      if (sim >= 0.7) {
        let conf = CONFIDENCE.FUZZY_SOLE_CANDIDATE * sim;
        if (minMatch) conf = Math.min(conf + 0.04, CONFIDENCE.EXACT_NAME - 0.01);
        if (maxMatch) conf = Math.min(conf + 0.02, CONFIDENCE.EXACT_NAME - 0.01);
        candidates.push({
          internalEntityId: internal.id,
          internalEntityName: internal.name,
          confidence: conf,
          reason: `Fuzzy name (${Math.round(sim * 100)}%)`,
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
