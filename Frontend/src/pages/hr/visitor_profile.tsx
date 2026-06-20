// pages/hr/visitor_profile.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, X, Check, Calendar as CalendarIcon, 
  User, CalendarDays, Users, Shield, FileText, Download, 
  Search, CheckCircle2, Clock, XCircle, Eye, Building, Briefcase, MapPin, Mail, Phone
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import type { TableColumn } from '../../types/visitor';
import { supabase } from '../../lib/supabase';

export default function VisitorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [currentVisit, setCurrentVisit] = useState<any>(null);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<any>(null);

  useEffect(() => {
    const fetchVisitData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('visits')
          .select(`
            *,
            visitors (*),
            host:employees!visits_host_employee_id_fkey(name),
            escorts(*)
          `)
          .eq('visitor_id', id)
          .order('start_date', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setCurrentVisit(data[0]);

          const formattedHistory = data.map((h: any) => ({
            visitId: h.visit_id,
            rawDate: h.start_date,
            date: new Date(h.start_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ''),
            department: h.department || 'General Unit',
            hostName: h.host?.name || 'Unassigned',
            purpose: h.purpose || 'N/A',
            pipeline: h.visit_type === 'PRESCHEDULED' ? 'Pre-Scheduled' : h.visit_type === 'REPEATED' ? 'Repeated' : 'Walk-in',
            escortCount: h.escorts?.length || 0,
            status: h.status
          }));

          setVisitHistory(formattedHistory);
        } else {
          setCurrentVisit(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitData();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!currentVisit) return;
    try {
      const { error } = await supabase.from('visits').update({ status: newStatus }).eq('visit_id', currentVisit.visit_id);
      if (error) throw error;
      
      setCurrentVisit({ ...currentVisit, status: newStatus });
      setVisitHistory(prev => prev.map(h => h.visitId === currentVisit.visit_id ? { ...h, status: newStatus } : h));
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to process status change.");
    }
  };

  const filteredHistory = useMemo(() => {
    if (!historySearch) return visitHistory;
    const query = historySearch.toLowerCase();
    return visitHistory.filter(h => 
      h.visitId.toLowerCase().includes(query) || 
      h.purpose.toLowerCase().includes(query) ||
      h.hostName.toLowerCase().includes(query)
    );
  }, [visitHistory, historySearch]);

  const historyColumns: TableColumn<any>[] = [
    { key: 'visitId', label: 'PASS ID', render: (row) => <span className="text-slate-800 font-mono font-bold text-xs">{row.visitId}</span> },
    { key: 'date', label: 'VISIT DATE & TIME', render: (row) => <span className="text-xs font-medium text-slate-600 font-mono">{row.date}</span> },
    { 
      key: 'destination', 
      label: 'DESTINATION & HOST', 
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800 text-xs">{row.department}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Host: {row.hostName}</div>
        </div>
      )
    },
    { key: 'purpose', label: 'PURPOSE', render: (row) => <span className="text-xs text-slate-600 font-medium line-clamp-1 max-w-[200px]">{row.purpose}</span> },
    { key: 'pipeline', label: 'PIPELINE', render: (row) => <span className="text-[10px] font-bold font-mono tracking-wide bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-500 uppercase">{row.pipeline}</span> },
    { 
      key: 'escorts', 
      label: 'ESCORTS', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.escortCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-400 border border-slate-100'} border`}>
          {row.escortCount} {row.escortCount === 1 ? 'Personnel' : 'Personnel'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'OUTCOME',
      render: (row) => {
        if (row.status === 'Approved' || row.status === 'Cleared') return <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded font-bold uppercase tracking-wider">Approved</span>;
        if (row.status === 'Pending') return <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded font-bold uppercase tracking-wider animate-pulse">Pending</span>;
        return <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded font-bold uppercase tracking-wider">Denied</span>;
      }
    },
    {
      key: 'action',
      label: '',
      render: (row) => (
        <button 
          onClick={() => { setSelectedHistoryLog(row); setIsDrawerOpen(true); }}
          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="View Check-in/Out Log"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  if (loading) {
    return (
      <DashboardLayout role="hr" userName="Sinchana K">
        <div className="flex justify-center items-center h-[60vh]"><div className="animate-pulse w-8 h-8 bg-blue-600 rounded-full" /></div>
      </DashboardLayout>
    );
  }

  if (!currentVisit) {
    return (
      <DashboardLayout role="hr" userName="Sinchana K">
        <div className="text-center mt-20">
          <h2 className="text-xl font-bold text-slate-700">Visitor Profile Not Found</h2>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Go Back</button>
        </div>
      </DashboardLayout>
    );
  }

  const v = currentVisit.visitors;
  const isForeign = v.nationality && v.nationality.toLowerCase() !== 'indian';
  const displayCategory = isForeign ? 'Foreign National' : 'General Walk-in'; 
  const computedPipeline = currentVisit.visit_type === 'PRESCHEDULED' ? 'Pre-Scheduled' : currentVisit.visit_type === 'REPEATED' ? 'Repeated' : 'Walk-in';

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans text-slate-800">
        
        {/* --- ACTIONS HEADER ROW --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Ledger Dashboard
          </button>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={() => navigate(`/hr/add_visitor?category=${isForeign ? 'foreign' : 'general'}`, { state: { autofill: { ...v, id: v.visitor_id, visitorName: v.name } } })} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors flex items-center shadow-sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Visit Token
            </button>
            <button onClick={() => handleUpdateStatus('Denied')} className="px-4 py-2 bg-white border border-rose-200 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-50 transition-colors flex items-center shadow-sm">
              <X className="w-3.5 h-3.5 mr-1.5" /> Reject Registry
            </button>
            <button onClick={() => handleUpdateStatus('Approved')} className="px-4 py-2 bg-emerald-600 border border-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all flex items-center shadow-sm">
              <Check className="w-3.5 h-3.5 mr-1.5" /> Approve Entry
            </button>
            <button className="px-4 py-2 bg-slate-900 border border-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all flex items-center shadow-sm">
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" /> Dispatch Credential
            </button>
          </div>
        </div>

        {/* --- PREMIUM COMPREHENSIVE PROFILE CARD --- */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-xl shrink-0 shadow-inner">
              {v.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{v.name}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${isForeign ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {displayCategory}
                </span>
                <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${currentVisit.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : currentVisit.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                  {currentVisit.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-semibold">
                <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> {v.organization || 'Independent Operator'}</span>
                <span className="text-slate-200">•</span>
                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {v.designation || 'Classified Visitor'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-10 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-10">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Token</div>
              <div className="text-xs font-mono font-bold text-slate-800">{currentVisit.visit_id}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Window Target</div>
              <div className="text-xs font-bold text-slate-800 font-mono">{new Date(currentVisit.start_date).toLocaleDateString('en-IN')}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pipeline Pathway</div>
              <div className="text-xs font-bold text-slate-700">{computedPipeline}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Allocation Rule</div>
              <div className="text-xs font-bold text-slate-700">ONE_DAY</div>
            </div>
          </div>
        </div>

        {/* --- CORE DATA FOUR-PANEL GRID LAYOUT --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Panel 1: Personal Dossier */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><User className="w-4 h-4" /></div>
                <h3 className="text-sm font-bold text-slate-800">Visitor Dossier</h3>
              </div>
              <div className="space-y-3.5 text-xs">
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Gender Spec</span><span className="font-bold text-slate-800">{v.gender || 'Classified'}</span></div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Date of Birth</span><span className="font-bold text-slate-800 font-mono">{v.dob || 'N/A'}</span></div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">State Nationality</span><span className="font-bold text-slate-800">{v.nationality || 'Indian'}</span></div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Contact Comms</span><span className="font-bold text-slate-800 font-mono">{v.phone}</span></div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Secure Email</span><span className="font-bold text-slate-800 break-all font-mono">{v.email || 'N/A'}</span></div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Terminal Address</span><span className="font-medium text-slate-700 leading-relaxed">{v.address || 'N/A'}</span></div>
              </div>
            </div>
          </div>

          {/* Panel 2: Deployment Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50 mb-4">
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><CalendarDays className="w-4 h-4" /></div>
                <h3 className="text-sm font-bold text-slate-800">Deployment Config</h3>
              </div>
              <div className="space-y-3.5 text-xs">
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Classification Track</span><span className="font-bold text-slate-800">{displayCategory}</span></div>
                <div className="flex flex-col">
                  <span className="text-slate-400 font-medium mb-1">Objective Statement</span>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-lg text-slate-700 leading-relaxed max-h-24 overflow-y-auto font-medium">
                    {currentVisit.purpose}
                  </div>
                </div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Ingress Log Timestamp</span><span className="font-bold text-slate-800 font-mono">{new Date(currentVisit.created_at).toLocaleString('en-GB')}</span></div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Operational Unit</span><span className="font-bold text-slate-800">{currentVisit.department || 'General Base Operations'}</span></div>
              </div>
            </div>
          </div>

          {/* Panel 3: Sponsor & Contingent Operations */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><Users className="w-4 h-4" /></div>
                <h3 className="text-sm font-bold text-slate-800">Sponsor Matrix</h3>
              </div>
              <div className="space-y-3.5 text-xs">
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Personnel Sponsor</span><span className="font-bold text-slate-800">{currentVisit.host?.name || 'Unassigned'}</span></div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Sponsor Token ID</span><span className="font-bold text-slate-800 font-mono">{currentVisit.host_employee_id || 'N/A'}</span></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-wider">Accompanying Contingent</span>
              {currentVisit.escorts && currentVisit.escorts.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
                  {currentVisit.escorts.map((escort: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs font-bold text-slate-700 truncate">{escort.name}</span>
                      <span className="text-[9px] font-bold font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0 ml-2">CONT_{idx+1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic font-medium py-1">No attached companion assets detected.</div>
              )}
            </div>
          </div>

          {/* Panel 4: Security Verification Vault */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600"><Shield className="w-4 h-4" /></div>
                <h3 className="text-sm font-bold text-slate-800">Clearance Vault</h3>
              </div>
              <div className="space-y-3.5 text-xs">
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Verification Rule</span><span className="font-bold text-slate-800 uppercase tracking-wide">{v.id_type}</span></div>
                <div className="flex flex-col"><span className="text-slate-400 font-medium mb-0.5">Registry Serial ID</span><span className="font-bold text-slate-800 font-mono tracking-wider">{v.id_number}</span></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-wider">Credential Token Copy</span>
              {v.document_url || currentVisit.document_url ? (
                <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl p-2">
                  <div className="flex items-center overflow-hidden gap-2">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0"><FileText className="w-3.5 h-3.5" /></div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-blue-900 truncate">VERIFY_MANIFEST.pdf</div>
                    </div>
                  </div>
                  <a href={v.document_url || currentVisit.document_url} target="_blank" rel="noreferrer" className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100/60 rounded-md transition-colors shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="p-3 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-center text-[11px] font-medium text-slate-400">
                  No encrypted copy uploaded.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* --- VISITATION LEDGER HISTORICAL TIMELINE --- */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
          <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-600" /> Historical Verification Log
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Chronological audit ledger of all requested and processed entries.</p>
            </div>
            
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search pass token ID, host or targets..." 
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DataTable title="" data={filteredHistory} columns={historyColumns} />
          </div>
        </div>

        {/* --- LIGHT SLIDE-OUT METRIC LOG DRAWER --- */}
        {isDrawerOpen && selectedHistoryLog && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Base Check-In Manifest</h2>
                  <p className="text-xs font-mono text-blue-600 mt-0.5 font-bold">{selectedHistoryLog.visitId}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Gate Validation Events</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 mr-3 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">Ingress Authorized</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">10:15 AM • Gate Station 01</div>
                      </div>
                    </div>
                    
                    <div className="w-0.5 h-6 bg-slate-100 ml-[3px] my-1" />
                    
                    <div className="flex items-start">
                      <div className="mt-1 w-2 h-2 rounded-full bg-rose-500 mr-3 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">Egress Dispatched</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">04:30 PM • Gate Station 01</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-700 block mb-1">Operational Notice</span>
                  <p className="text-[11px] leading-relaxed text-slate-400 font-medium">
                    Gate entry validation cycles are hardcoded for preview logs. Active syncing occurs when gate RFID sensors route credentials.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </DashboardLayout>
  );
}