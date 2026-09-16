import { useState, useMemo } from 'react';

export interface UseTablePaginationOptions<T> {
  initialPageSize?: number;
  initialSortKey?: keyof T | string;
  initialSortDirection?: 'asc' | 'desc';
  pageSizeOptions?: number[];
}

export function useTablePagination<T>(
  items: T[],
  options: UseTablePaginationOptions<T> = {}
) {
  const {
    initialPageSize = 5,
    initialSortKey = '',
    initialSortDirection = 'asc',
  } = options;

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [sortKey, setSortKey] = useState<string>(String(initialSortKey));
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;

    return [...items].sort((a: any, b: any) => {
      // Accès imbriqué possible (ex: 'versions.0.file_size_bytes' ou direct 'name')
      const valA = sortKey.includes('.')
        ? sortKey.split('.').reduce((acc, part) => acc?.[part], a)
        : a[sortKey];
      const valB = sortKey.includes('.')
        ? sortKey.split('.').reduce((acc, part) => acc?.[part], b)
        : b[sortKey];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        comparison = valA === valB ? 0 : valA ? -1 : 1;
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortKey, sortDirection]);

  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ajustement de la page si hors limites
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, safeCurrentPage, pageSize]);

  return {
    currentPage: safeCurrentPage,
    pageSize,
    totalItems,
    totalPages,
    sortKey,
    sortDirection,
    paginatedItems,
    sortedItems,
    setCurrentPage,
    setPageSize,
    handleSort,
  };
}
