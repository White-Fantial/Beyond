"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { PaginationMeta } from "@/types/admin";

interface AdminPaginationProps {
  pagination: PaginationMeta;
}

export default function AdminPagination({ pagination }: AdminPaginationProps) {
  const { page, totalPages, total, pageSize } = pagination;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function buildUrl(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-500">
        {start}–{end} / 총 {total}건
      </p>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={buildUrl(page - 1)}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            이전
          </Link>
        )}
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          // Show pages around current
          let p: number;
          if (totalPages <= 5) {
            p = i + 1;
          } else if (page <= 3) {
            p = i + 1;
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i;
          } else {
            p = page - 2 + i;
          }
          return (
            <Link
              key={p}
              href={buildUrl(p)}
              className={`px-3 py-1.5 text-sm rounded border ${
                p === page
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          );
        })}
        {page < totalPages && (
          <Link
            href={buildUrl(page + 1)}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            다음
          </Link>
        )}
      </div>
    </div>
  );
}
