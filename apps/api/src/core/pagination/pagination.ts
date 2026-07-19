// API_RULES §8: page=1/pageSize=20 defaults, pageSize clamped (not rejected) at 100, every
// list endpoint returns this same meta shape. One shared helper so pagination math is
// never reimplemented per module (Production Hardening — Critical finding: no list
// endpoint enforced pagination).
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function normalizePagination(page?: number | string, pageSize?: number | string) {
  const parsedPage = Number(page);
  const parsedPageSize = Number(pageSize);
  const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  const safePageSize =
    Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? Math.min(Math.floor(parsedPageSize), 100) : 20;
  return { page: safePage, pageSize: safePageSize };
}

export function buildMeta(page: number, pageSize: number, totalItems: number): PaginationMeta {
  return { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}
