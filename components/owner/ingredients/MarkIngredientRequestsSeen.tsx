"use client";

import { useEffect } from "react";

/**
 * Fires PATCH /api/owner/ingredient-requests/mark-seen once on mount.
 * Rendered inside the ingredient requests page to acknowledge unseen updates.
 */
export default function MarkIngredientRequestsSeen() {
  useEffect(() => {
    fetch("/api/owner/ingredient-requests/mark-seen", { method: "PATCH" }).catch(() => {
      // best-effort — failures are silent
    });
  }, []);

  return null;
}
