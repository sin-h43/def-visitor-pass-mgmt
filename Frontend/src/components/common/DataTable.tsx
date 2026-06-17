import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import type { TableColumn } from '../../types/visitor';

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: TableColumn<T>[];
  tabs?: string[]; // e.g., ['All Visitors', 'Pre-Scheduled', 'Repeated']
}

export default function DataTable<T>({ title, data, columns, tabs }: DataTableProps<T>) {
  const [activeTab, setActiveTab] = useState(tabs ? tabs[0] : '');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="bg-white border border-slate-400/80 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-400/60 bg-white flex flex-col gap-4">
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        
        <div className="flex items-center justify-between">
          {/* Left Side: Tabs */}
          <div className="flex space-x-6 text-sm font-medium">
            {tabs?.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right Side: Search & Filters */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search visitor, host or ID..." 
                className="pl-9 pr-4 py-2 text-sm border border-slate-400/60 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-400/60 rounded-lg hover:bg-slate-50">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>
      </div>

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
            {/* Logic to filter 'data' based on activeTab & searchTerm goes here */}
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 text-slate-700">
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination (Static representation for layout) */}
      <div className="p-4 border-t border-slate-400/60 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50">
        <span>Showing 1 to {Math.min(data.length, 5)} of {data.length} entries</span>
        {/* Add real pagination logic later */}
      </div>
    </div>
  );
}