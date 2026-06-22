import React, { useState } from 'react';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  keyExtractor?: (row: T) => string | number;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  actions,
  keyExtractor = (row: any) => row.id,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a: any, b: any) => {
      // Basic nested key support (e.g., 'category.name')
      const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
      };

      const valA = getNestedValue(a, sortConfig.key);
      const valB = getNestedValue(b, sortConfig.key);
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border-primary bg-surface-card">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-text-muted uppercase bg-surface-secondary/50 border-b border-border-primary">
          <tr>
            {columns.map((col) => (
              <th 
                key={col.key} 
                scope="col" 
                className={`px-4 py-3 font-medium ${getAlignClass(col.align)} ${col.sortable ? 'cursor-pointer select-none hover:text-text-primary transition-colors' : ''}`}
                style={{ width: col.width }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                  {col.header}
                  {col.sortable && (
                    <span className="text-text-muted/50">
                      {sortConfig?.key === col.key ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {actions && (
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Skeleton loader
            Array.from({ length: 5 }).map((_, _i) => (
              <tr key={`skeleton-${_i}`} className="border-b border-border-primary/50">
                {columns.map((_col, _j) => (
                  <td key={`skel-td-${_i}-${_j}`} className="px-4 py-4">
                    <div className="h-4 skeleton rounded w-3/4"></div>
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-4">
                    <div className="h-4 skeleton rounded w-16 ml-auto"></div>
                  </td>
                )}
              </tr>
            ))
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, _i) => (
              <tr 
                key={keyExtractor(row)} 
                className={`border-b border-border-primary/30 last:border-0 hover:bg-surface-secondary/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col) => {
                  // Get nested value
                  const value = col.key.split('.').reduce((acc: any, part) => acc && acc[part], row as any);
                  
                  return (
                    <td key={`${keyExtractor(row)}-${col.key}`} className={`px-4 py-3 ${getAlignClass(col.align)}`}>
                      {col.render ? col.render(value, row) : (value as React.ReactNode)}
                    </td>
                  );
                })}
                {actions && (
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
