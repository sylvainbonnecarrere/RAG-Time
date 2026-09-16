import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
} from 'lucide-react';

export interface TablePaginationBarProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  itemLabel?: string;
  idPrefix?: string;
}

export const TablePaginationBar: React.FC<TablePaginationBarProps> = ({
  currentPage,
  pageSize,
  totalItems,
  totalPages: explicitTotalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50],
  itemName,
  itemLabel,
  idPrefix = 'table-pagination',
}) => {
  const displayItemName = itemLabel || itemName || 'éléments';
  const totalPages = explicitTotalPages !== undefined ? explicitTotalPages : Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div
      id={idPrefix}
      className="px-4 py-3 bg-zinc-950/70 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400"
    >
      {/* Sélecteur de taille de page & Compteur */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400">Afficher</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-zinc-900 border border-zinc-700/80 rounded-md px-2 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
            aria-label="Nombre d'éléments par page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-zinc-400">par page</span>
        </div>

        <div className="font-mono text-[11px] text-zinc-400">
          <strong className="text-zinc-200">{startItem}</strong> - <strong className="text-zinc-200">{endItem}</strong> sur{' '}
          <strong className="text-indigo-400">{totalItems}</strong> {displayItemName}
        </div>
      </div>

      {/* Contrôles de navigation de pages */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <span className="text-[11px] text-zinc-400 mr-1 hidden sm:inline">
          Page <strong className="text-zinc-200">{safeCurrentPage}</strong> / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
          title="Première page"
          aria-label="Première page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
          title="Page précédente"
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Boutons pages numérotées (autour de la page courante) */}
        <div className="flex items-center gap-1 mx-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
            .map((page, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev && page - prev > 1;
              return (
                <React.Fragment key={page}>
                  {showEllipsis && <span className="px-1 text-zinc-600 font-mono text-xs">…</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    className={`min-w-[24px] h-6 px-1.5 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                      page === safeCurrentPage
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
          title="Page suivante"
          aria-label="Page suivante"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
          title="Dernière page"
          aria-label="Dernière page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export interface TableSortHeaderProps {
  label?: string;
  title?: string;
  sortKey?: string;
  columnKey?: string;
  currentSortKey: string;
  currentDirection?: 'asc' | 'desc';
  currentSortDirection?: 'asc' | 'desc';
  onSort: (key: string) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

/**
 * En-tête de colonne triable pour tableaux RAG (US-FRONT-25)
 * Rendu sous forme de bouton interactif propre pour éviter toute imbrication invalide <th> dans <th>
 */
export const TableSortHeader: React.FC<TableSortHeaderProps> = ({
  label,
  title,
  sortKey,
  columnKey,
  currentSortKey,
  currentDirection,
  currentSortDirection,
  onSort,
  align = 'left',
  className = '',
}) => {
  const text = label || title || '';
  const key = sortKey || columnKey || '';
  const direction = currentDirection || currentSortDirection || 'asc';
  const isCurrent = currentSortKey === key;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSort(key);
      }}
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider select-none cursor-pointer transition-colors focus:outline-none group ${
        isCurrent ? 'text-indigo-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
      } ${align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : 'justify-start'} ${className}`}
      title={`Trier par ${text} (${isCurrent ? (direction === 'asc' ? 'ordre croissant' : 'ordre décroissant') : 'cliquer pour trier'})`}
    >
      <span className="truncate">{text}</span>
      <span className="shrink-0 inline-flex items-center">
        {isCurrent ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-60 transition-opacity" />
        )}
      </span>
    </button>
  );
};

export interface TableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  totalResults?: number;
  filteredCount?: number;
  itemLabel?: string;
  className?: string;
  id?: string;
}

/**
 * Moteur de recherche et filtre textuel rapide pour tableaux de données RAG (US-FRONT-25)
 */
export const TableSearchBar: React.FC<TableSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Rechercher dans ce tableau...',
  totalResults,
  filteredCount,
  itemLabel = 'éléments',
  className = '',
  id,
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-4 py-2.5 bg-zinc-950/60 border-b border-zinc-800/80 text-xs ${className}`}>
      <div className="relative flex-1 max-w-sm">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-900/90 border border-zinc-750 rounded-lg pl-8.5 pr-8 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
            title="Effacer la recherche"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {(totalResults !== undefined || filteredCount !== undefined) && (
        <div className="text-[11px] font-mono text-zinc-400 self-end sm:self-center">
          {filteredCount !== undefined && totalResults !== undefined && filteredCount !== totalResults ? (
            <span>
              <strong className="text-indigo-400 font-semibold">{filteredCount}</strong> résultat{filteredCount > 1 ? 's' : ''} trouvé{filteredCount > 1 ? 's' : ''} sur {totalResults} {itemLabel}
            </span>
          ) : (
            <span>
              Total : <strong className="text-zinc-300">{totalResults ?? filteredCount}</strong> {itemLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
