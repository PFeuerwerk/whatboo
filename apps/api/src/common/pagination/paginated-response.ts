export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  take: number;
  skip: number;
}

export function normalizePagination(input: { take?: number; skip?: number }) {
  const take = Math.min(Math.max(Number(input.take ?? 50), 1), 100);
  const skip = Math.max(Number(input.skip ?? 0), 0);
  return { take, skip };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  input: { take?: number; skip?: number },
): PaginatedResponse<T> {
  const { take, skip } = normalizePagination(input);
  return { data, total, take, skip };
}
