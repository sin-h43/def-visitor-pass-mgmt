// components/common/SearchFilterMatrix.tsx
import { useState } from 'react';
import { Search, Filter } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBucket {
  key: string;
  title: string;
  options: FilterOption[];
}

interface SearchFilterMatrixProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedFilters: Record<string, string[]>;
  onFilterToggle: (bucketKey: string, value: string) => void;
  filterBuckets: FilterBucket[];
  placeholder?: string;
}

export default function SearchFilterMatrix({
  searchTerm,
  onSearchChange,
  selectedFilters,
  onFilterToggle,
  filterBuckets,
  placeholder = "Search records..."
}: SearchFilterMatrixProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="flex items-center space-x-3 relative">
      {/* Search Input Framework */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder={placeholder} 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-4 py-2 text-sm border border-slate-400/60 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-slate-800 font-medium"
        />
      </div>

      {/* Dropdown Layout Checkbox Frame */}
      <div className="relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-400/60 rounded-lg hover:bg-slate-50 gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters Matrix
        </button>

        {isDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-400/80 rounded-xl shadow-xl p-4 z-20 space-y-4 text-xs text-slate-700 max-h-[380px] overflow-y-auto">
              
              {filterBuckets.map((bucket, bIdx) => (
                <div key={bucket.key} className={bIdx > 0 ? "border-t pt-2" : ""}>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-2 text-[10px]">
                    {bucket.title}
                  </p>
                  {bucket.options.map(opt => (
                    <label key={opt.value} className="flex items-center space-x-2 py-1 font-medium text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={(selectedFilters[bucket.key] || []).includes(opt.value)}
                        onChange={() => onFilterToggle(bucket.key, opt.value)}
                        className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="truncate max-w-[220px]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              ))}

            </div>
          </>
        )}
      </div>
    </div>
  );
}