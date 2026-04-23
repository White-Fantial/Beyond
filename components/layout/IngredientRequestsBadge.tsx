"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Displays a numeric badge showing the count of ingredient requests that have been
 * reviewed but not yet seen by the owner. Re-fetches whenever the pathname changes
 * so it clears after the owner visits the ingredient-requests page.
 */
export default function IngredientRequestsBadge() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/owner/ingredient-requests/unseen-count")
      .then((r) => r.json())
      .then((json) => setCount(json?.data?.count ?? 0))
      .catch(() => setCount(0));
  }, [pathname]);

  if (count === 0) return null;

  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}
