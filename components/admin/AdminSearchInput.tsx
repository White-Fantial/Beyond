"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef } from "react";

interface AdminSearchInputProps {
  placeholder?: string;
  paramName?: string;
}

export default function AdminSearchInput({
  placeholder = "검색...",
  paramName = "q",
}: AdminSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultValue = searchParams.get(paramName) ?? "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const value = e.target.value;
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(paramName, value);
      } else {
        params.delete(paramName);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full sm:w-72 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
    />
  );
}
