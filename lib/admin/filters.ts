// Shared filter/param normalization utilities for admin queries.

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface NormalizedListParams {
  q: string;
  status: string | undefined;
  page: number;
  pageSize: number;
  skip: number;
}

export function normalizeListParams(raw: {
  q?: string;
  status?: string;
  page?: string | number;
  pageSize?: string | number;
}): NormalizedListParams {
  const page = Math.max(1, Number(raw.page ?? 1) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(raw.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE)
  );
  return {
    q: (raw.q ?? "").trim(),
    status: raw.status || undefined,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function buildPaginationMeta(total: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
