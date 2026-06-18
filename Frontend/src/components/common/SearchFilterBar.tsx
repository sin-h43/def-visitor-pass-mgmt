// components/common/SearchFilterBar.tsx
import { useState, useRef, useEffect } from 'react';
import { Search, Filter, Check } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  key: string;
  title: string;
  options: FilterOption[];
}

interface SearchFilterBarProps {
  value: string;
  onChange: (value: string) => void;
  selectedFilters: Record<string, string[]>;
  onFilterToggle: (groupKey: string, value: string) => void;
  filterGroups: FilterGroup[];
  placeholder?: string;
}

export default function SearchFilterBar({
  value,
  onChange,
  selectedFilters,
  onFilterToggle,
  filterGroups,
  placeholder = "Search by name or Pass ID..."
}: SearchFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center w-full gap-2" ref={dropdownRef}>
      {/* Dynamic Search Box Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all font-medium"
        />
      </div>

      {/* Multi-Feature Filter Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center px-4 py-2 text-sm font-semibold border rounded-lg shadow-sm transition-all gap-2 bg-white ${
            isOpen ? 'border-blue-500 text-blue-600 bg-blue-50/10' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4 text-slate-500" />
          <span>Advanced Filters</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 space-y-4 max-h-[360px] overflow-y-auto animate-fade-in">
            {filterGroups.map((group, gIdx) => (
              <div key={group.key} className={gIdx > 0 ? "border-t border-slate-100 pt-3" : ""}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.options.map((opt) => {
                    const isChecked = (selectedFilters[group.key] || []).includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        onClick={() => onFilterToggle(group.key, opt.value)}
                        className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 font-medium cursor-pointer rounded hover:bg-slate-50 transition-colors"
                      >
                        <span className="truncate max-w-[180px]">{opt.label}</span>
                        <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
                          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}