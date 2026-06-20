// components/common/DataTable.tsx
import type { TableColumn } from '../../types/visitor';

interface DataTableProps<T> {
  title?: string;
  data: T[];
  columns: TableColumn<T>[];
}

export default function DataTable<T>({ title, data, columns }: DataTableProps<T>) {
  return (
    <div className="bg-white border border-slate-400/80 rounded-xl overflow-hidden shadow-sm">
      
      {/* Table Header Controls (Only renders if a title is passed) */}
      {title && (
        <div className="p-4 border-b border-slate-400/60 bg-white">
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-400/60">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className="px-6 py-4 font-medium">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-400/60">
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-2 text-slate-700">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-400 font-medium">
                  No records found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination (Static representation for layout) */}
      <div className="p-4 border-t border-slate-400/60 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50">
        <span>Showing {Math.min(data.length, 5)} of {data.length} entries</span>
      </div>
    </div>
  );
}