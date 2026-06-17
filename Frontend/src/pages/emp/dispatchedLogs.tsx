// pages/emp/dispatchedlogs.tsx
import React, { useState, useEffect } from 'react';
import { Eye, FileText, ArrowLeft, RefreshCw, CheckCircle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterMatrix from '../../components/common/SearchFilterMatrix';

interface VisitorRecord {
  id: string;
  visitorName: string;
  phone: string;
  email: string;
  pipeline: string;
  classification: string;
  purpose: string;
  hostName: string;
  hostDept: string;
  requestDate: string;
  status: string;
}

export default function DispatchedLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<VisitorRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    pipeline: [],
    status: [],
    classification: []
  });

  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
// Pull data once on mount and save it to the source of truth
useEffect(() => {
  const stored = localStorage.getItem('DEFENCE_SHIFT_LOGS');
  if (stored) {
    const parsed = JSON.parse(stored);
    setLogs(parsed); // This is all you need!
  }
}, []);

  const filterBuckets = [
    {
      key: 'pipeline',
      title: 'Pipeline Context',
      options: [
        { label: 'Immediate Access / Live Walk-in', value: 'Immediate Access / Live Walk-in' },
        { label: 'Pre-Scheduled Visit', value: 'Pre-Scheduled Visit' },
        { label: 'Repeated Visitor', value: 'Repeated Visitor' },
      ]
    },
    {
      key: 'status',
      title: 'Clearance Status',
      options: [
        { label: 'Cleared', value: 'Cleared' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Expired', value: 'Expired' },
      ]
    },
    {
      key: 'classification',
      title: 'Department Classification',
      options: [
        { label: 'IT Department', value: 'IT Department' },
        { label: 'Cyber Security Unit', value: 'Cyber Security Unit' },
        { label: 'Logistics Division', value: 'Logistics Division' },
        { label: 'Human Resources', value: 'Human Resources' },
        { label: 'General Unit', value: 'General Unit' },
      ]
    }
  ];

  const handleFilterToggle = (bucketKey: string, value: string) => {
    setSelectedFilters(prev => {
      const currentSelection = prev[bucketKey] || [];
      const updatedSelection = currentSelection.includes(value)
        ? currentSelection.filter(item => item !== value)
        : [...currentSelection, value];
      return { ...prev, [bucketKey]: updatedSelection };
    });
  };

  // Process sorting/filtering queries across stored data layers
  const visibleRows = React.useMemo(() => {
    return logs.filter(item => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        if (!item.visitorName.toLowerCase().includes(query) && !item.id.toLowerCase().includes(query)) return false;
      }
      for (const key of Object.keys(selectedFilters)) {
        const vals = selectedFilters[key];
        if (vals.length > 0 && !vals.includes(item[key as keyof VisitorRecord])) return false;
      }
      return true;
    });
  }, [logs, searchTerm, selectedFilters]);

  return (
    <DashboardLayout role="emp" userName="Sinchana K">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-6">
          <Link to="/emp" className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors w-fit mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Terminal Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Your Dispatched Pass Logs</h1>
          <p className="text-sm text-slate-500">Historical archive ledger for credentials generated at this portal station</p>
        </div>

        <div className="bg-white border border-slate-400/80 rounded-xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-400/60 bg-white flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base">Archived Historical Entries</h3>
            
            <SearchFilterMatrix 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedFilters={selectedFilters}
              onFilterToggle={handleFilterToggle}
              filterBuckets={filterBuckets}
              placeholder="Search name or pass ID..."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-400/60 font-semibold">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">REGISTRY ID</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">VISITOR NAME</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">PIPELINE TYPE</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">ASSIGNED UNIT</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">DISPATCHED TIME</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">STATUS</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400/60 font-medium">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No historical dispatch items discovered in browser cache history templates.</td>
                  </tr>
                ) : (
                  visibleRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-amber-600 font-bold">{row.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{row.visitorName}</div>
                        <div className="text-xs text-slate-500">{row.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs font-semibold">{row.pipeline}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-bold">{row.classification}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{row.requestDate}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-800 text-white text-xs rounded font-bold">{row.status}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => { setSelectedVisitor(row); setIsDetailOpen(true); }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- LIGHT-THEMED MASTER DETAIL DRAWER --- */}
        {isDetailOpen && selectedVisitor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDetailOpen(false)}></div>
            <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-400/80 flex flex-col overflow-hidden animate-fade-in">
              
              <div className="p-5 border-b border-slate-400/60 bg-slate-50 text-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Complete Access Registry Profile</h3>
                  <p className="text-xs text-slate-500 mt-1">Pass ID Reference: <span className="text-blue-600 font-bold">{selectedVisitor.id}</span></p>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-400/60 shadow-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5 tracking-wider">VISITOR IDENTIFICATION</span>
                      <span className="font-bold text-slate-800 text-base">{selectedVisitor.visitorName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5 tracking-wider">PHONE CONTACT</span>
                      <span className="font-medium text-slate-700">{selectedVisitor.phone}</span>
                    </div>
                    <div className="col-span-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5 tracking-wider">SECURE DIGEST EMAIL</span>
                      <span className="font-medium text-slate-700 text-sm break-all">{selectedVisitor.email}</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-400/60 shadow-xs space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1 tracking-wider">VISITATION ENTRY LOG LOGIC</span>
                      <p className="text-slate-800 font-medium text-xs bg-slate-50 p-3 border border-slate-200 rounded-lg leading-relaxed">{selectedVisitor.purpose}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block tracking-wider">PIPELINE TYPE</span>
                        <span className="text-xs font-bold text-slate-800">{selectedVisitor.pipeline}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block tracking-wider">CLASSIFICATION</span>
                        <span className="text-xs font-bold text-purple-700">{selectedVisitor.classification}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block tracking-wider">DESIGNATED HOST</span>
                        <span className="text-xs font-bold text-slate-800">{selectedVisitor.hostName}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-slate-400/60 shadow-xs flex flex-col justify-center text-center text-slate-400 p-4 border-dashed min-h-[180px]">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <span className="font-bold text-slate-600 text-xs break-all">encrypted_identity_token.pdf</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Secure View Matrix Active</span>
                </div>
              </div>

              <div className="p-4 border-t border-slate-400/60 bg-white flex justify-between items-center">
                <span className="text-xs text-slate-500 flex items-center font-medium"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> Pass trace logged in local persistence cache.</span>
                <button 
                  onClick={() => { setIsDetailOpen(false); navigate(`/emp?autofill=${selectedVisitor.visitorName}`); }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-Register & Autofill
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}