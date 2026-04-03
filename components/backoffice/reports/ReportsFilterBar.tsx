"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

interface Props {
  days: number;
}

export default function ReportsFilterBar({ days }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (value: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("days", String(value));
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 font-medium mr-1">Period:</span>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            days === opt.value
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
