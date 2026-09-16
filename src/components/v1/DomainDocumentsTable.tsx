import React, { useState, useMemo } from 'react';
import { DocumentDTO, DocumentType, TenantDTO, UUID } from '../../contracts/api-types';
import { Eye, Trash2, Check, Copy } from 'lucide-react';
import { useTablePagination } from '../../hooks/useTablePagination';
import { TablePaginationBar, TableSortHeader, TableSearchBar } from './TablePaginationBar';

interface DomainDocumentsTableProps {
  documents: DocumentDTO[];
  tenant: TenantDTO;
  renderFileIcon: (type: DocumentType) => React.ReactNode;
  formatBytes: (bytes: number) => string;
  onCopyHash: (hash: string) => void;
  copiedHash: string | null;
  onConsult: (doc: DocumentDTO) => void;
  onDelete: (doc: DocumentDTO, tenantId: UUID) => void;
  tableIdPrefix?: string;
}

export const DomainDocumentsTable: React.FC<DomainDocumentsTableProps> = ({
  documents,
  tenant,
  renderFileIcon,
  formatBytes,
  onCopyHash,
  copiedHash,
  onConsult,
  onDelete,
  tableIdPrefix = 'domain-table',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrage textuel en temps réel (moteur de recherche du tableau)
  const filteredDocs = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const lower = searchTerm.toLowerCase().trim();
    return documents.filter((d) => {
      const matchName = d.name.toLowerCase().includes(lower);
      const matchType = d.file_type.toLowerCase().includes(lower);
      const matchHash = d.versions?.some((v) => v.sha256_hash.toLowerCase().includes(lower));
      return matchName || matchType || matchHash;
    });
  }, [documents, searchTerm]);

  const {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    sortKey,
    sortDirection,
    paginatedItems,
    setCurrentPage,
    setPageSize,
    handleSort,
  } = useTablePagination(filteredDocs, {
    initialPageSize: 5,
    initialSortKey: 'name',
    initialSortDirection: 'asc',
    pageSizeOptions: [5, 10, 25, 50],
  });

  if (documents.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-zinc-400 italic">
        Aucun document n'a été rattaché à ce domaine pour l'instant.
      </div>
    );
  }

  return (
    <div>
      {/* Moteur de recherche dédié au tableau (US-FRONT-25) */}
      <TableSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={`Rechercher parmi les documents de « ${tenant.name} » (nom, type, hash)...`}
        totalResults={documents.length}
        filteredCount={filteredDocs.length}
        itemLabel="document(s)"
        id={`search-${tableIdPrefix}-${tenant.id}`}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/50 text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800/80">
            <tr>
              <th className="py-2.5 px-4">
                <TableSortHeader
                  title="Document"
                  columnKey="name"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="py-2.5 px-4">
                <TableSortHeader
                  title="Version"
                  columnKey="current_version"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="py-2.5 px-4">SHA-256 (Intégrité)</th>
              <th className="py-2.5 px-4">
                <TableSortHeader
                  title="Chunks 768d"
                  columnKey="total_chunks"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="py-2.5 px-4">
                <TableSortHeader
                  title="Date MAJ"
                  columnKey="updated_at"
                  currentSortKey={sortKey}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {paginatedItems.map((doc) => {
              const latestVer = doc.versions[0];
              return (
                <tr key={doc.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {renderFileIcon(doc.file_type)}
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-200 truncate max-w-xs sm:max-w-md">
                          {doc.name}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {formatBytes(latestVer?.file_size_bytes || 0)} • {doc.file_type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono text-xs bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 px-2 py-0.5 rounded">
                      v{doc.current_version}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        title={latestVer?.sha256_checksum}
                        className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                      >
                        {latestVer?.sha256_checksum.slice(0, 10)}...
                      </span>
                      <button
                        type="button"
                        onClick={() => onCopyHash(latestVer?.sha256_checksum || '')}
                        className="p-1 hover:text-indigo-400 text-zinc-400 transition-colors"
                        title="Copier le hash SHA-256"
                      >
                        {copiedHash === latestVer?.sha256_checksum ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono text-zinc-300">
                      {doc.total_chunks} chunks
                    </span>
                  </td>

                  <td className="py-3 px-4 text-zinc-400 text-[11px]">
                    {new Date(doc.updated_at).toLocaleDateString('fr-FR')}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onConsult(doc)}
                        className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 flex items-center gap-1 transition-colors"
                        title="Consulter l'aperçu du document, métadonnées et chunks"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Consulter</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(doc, tenant.id)}
                        className="p-1.5 rounded bg-zinc-800/80 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 hover:border-rose-500/30 transition-colors"
                        title="Supprimer ce document et ses embeddings"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 25, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemLabel="document"
        idPrefix={`${tableIdPrefix}-${tenant.slug}`}
      />
    </div>
  );
};
