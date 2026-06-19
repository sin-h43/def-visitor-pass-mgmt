// pages/emp/index.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { UserPlus, FileText, Eye, RefreshCw, MoreVertical, X, CheckCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterMatrix from '../../components/common/SearchFilterMatrix';
import { supabase } from '../../lib/supabase';

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

export default function EmployeeDashboard() {
  const [searchParams] = useSearchParams();
  const [shiftData, setShiftData] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded current employee context (Replace with auth later)
  const currentUser = {
    empId: 'EMP001',
    name: 'Sinchana K',
    dept: 'Cyber Security Unit'
  };

  const [currentTab, setCurrentTab] = useState<'All Visitors' | 'Pre-Scheduled' | 'Repeated' | 'Expired'>('All Visitors');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    pipeline: [],
    status: [],
    classification: []
  });

  // UI States
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formPipeline, setFormPipeline] = useState('Immediate Access / Live Walk-in');
  const [formClassification, setFormClassification] = useState('IT Department');

  // Fetch Live Data from Supabase
  const fetchMyVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select(`
          visit_id,
          visit_type,
          purpose,
          status,
          start_date,
          created_at,
          visitors (name, phone, email)
        `)
        .eq('host_employee_id', currentUser.empId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const transformed: VisitorRecord[] = data.map((row: any) => {
          // Map DB types back to UI dropdown labels
          let uiPipeline = 'Immediate Access / Live Walk-in';
          if (row.visit_type === 'PRESCHEDULED') uiPipeline = 'Pre-Scheduled Visit';
          if (row.visit_type === 'REPEATED') uiPipeline = 'Repeated Visitor';

          // Extract classification if we embedded it in the purpose, otherwise default
          const purposeParts = (row.purpose || '').split('] ');
          const classification = purposeParts.length > 1 ? purposeParts[0].replace('[', '') : 'General Unit';
          const cleanPurpose = purposeParts.length > 1 ? purposeParts[1] : row.purpose;

          return {
            id: row.visit_id,
            visitorName: row.visitors?.name || 'Unknown',
            phone: row.visitors?.phone || 'N/A',
            email: row.visitors?.email || 'N/A',
            pipeline: uiPipeline,
            classification: classification,
            purpose: cleanPurpose || 'General Entry Clearance Walk-in Protocol',
            hostName: currentUser.name,
            hostDept: currentUser.dept,
            requestDate: new Date(row.start_date || row.created_at).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            status: row.status === 'Approved' ? 'Cleared' : row.status
          };
        });
        setShiftData(transformed);
      }
    } catch (err) {
      console.error("Error fetching shift data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVisits();
  }, []);

  // Listen for Autofill Parameters
  useEffect(() => {
    const autofillName = searchParams.get('autofill');
    if (autofillName) {
      setFormName(autofillName);
      setIsRegModalOpen(true);
    }
  }, [searchParams]);

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

  const visibleRows = useMemo(() => {
    return shiftData.filter(item => {
      if (currentTab === 'Pre-Scheduled' && item.pipeline !== 'Pre-Scheduled Visit') return false;
      if (currentTab === 'Repeated' && item.pipeline !== 'Repeated Visitor') return false;
      if (currentTab === 'Expired' && item.status !== 'Expired') return false;

      if (searchTerm) {
        const lowerQuery = searchTerm.toLowerCase();
        if (!item.visitorName.toLowerCase().includes(lowerQuery) && !item.id.toLowerCase().includes(lowerQuery)) return false;
      }

      for (const key of Object.keys(selectedFilters)) {
        const selectedValues = selectedFilters[key];
        if (selectedValues.length > 0 && !selectedValues.includes(item[key as keyof VisitorRecord])) return false;
      }
      return true;
    });
  }, [shiftData, currentTab, searchTerm, selectedFilters]);

  const handleFilterToggle = (bucketKey: string, value: string) => {
    setSelectedFilters(prev => {
      const currentSelection = prev[bucketKey] || [];
      const updatedSelection = currentSelection.includes(value)
        ? currentSelection.filter(item => item !== value)
        : [...currentSelection, value];
      return { ...prev, [bucketKey]: updatedSelection };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) return;
    setIsSubmitting(true);

    try {
      const timestamp = Date.now().toString().slice(-6);
      const newVisitorId = `VIS${timestamp}`;
      const newVisitId = `VST${timestamp}`;
      
      const dbPipeline = formPipeline === 'Pre-Scheduled Visit' ? 'PRESCHEDULED' : formPipeline === 'Repeated Visitor' ? 'REPEATED' : 'IMMEDIATE';
      const dbPurpose = `[${formClassification}] ${formPurpose || 'General Entry Clearance'}`;

      // 1. Insert Visitor
      const { error: visitorError } = await supabase.from('visitors').insert({
        visitor_id: newVisitorId,
        name: formName,
        phone: formPhone,
        email: formEmail || null,
        id_type: 'Aadhaar',
        id_number: 'PENDING'
      });
      if (visitorError) throw visitorError;

      // 2. Insert Visit
      const { error: visitError } = await supabase.from('visits').insert({
        visit_id: newVisitId,
        visitor_id: newVisitorId,
        host_employee_id: currentUser.empId,
        created_by_employee_id: currentUser.empId,
        visit_type: dbPipeline,
        pass_type: 'ONE_DAY',
        purpose: dbPurpose,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        status: 'Pending'
      });
      if (visitError) throw visitError;

      // Refresh table
      await fetchMyVisits();
      setIsRegModalOpen(false);
      setFormName(''); setFormPhone(''); setFormEmail(''); setFormPurpose('');
    } catch (err) {
      console.error("Failed to register visitor:", err);
      alert("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (visitId: string) => {
    if(!window.confirm("Are you sure you want to revoke this pass request?")) return;
    try {
      await supabase.from('visits').delete().eq('visit_id', visitId);
      setShiftData(prev => prev.filter(x => x.id !== visitId));
    } catch (err) {
      console.error("Failed to revoke pass:", err);
    } finally {
      setActiveMenuId(null);
    }
  };

  return (
    <DashboardLayout role="emp" userName={currentUser.name}>
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back, {currentUser.name}!</h1>
          <p className="text-sm text-slate-500">Gate 1 Reception . Core Entry Registration Console</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div 
            onClick={() => setIsRegModalOpen(true)}
            className="flex items-center justify-between p-6 bg-white border border-slate-400/60 rounded-xl hover:border-amber-500 hover:shadow-sm transition-all group cursor-pointer"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Register New Visitor</h3>
              <p className="text-sm text-slate-500 mt-2">Initiate live walk-in profiles or handle immediate credential logging processes.</p>
              <span className="text-amber-500 text-sm font-medium mt-4 inline-block group-hover:underline">Launch Form Sheet →</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border border-amber-200 bg-amber-50 rounded-lg text-amber-600 shrink-0">
              <UserPlus className="w-8 h-8 mb-2" />
              <span className="font-semibold text-sm">Add Visitor</span>
            </div>
          </div>

          <Link to="/emp/dispatchedlogs" className="block">
            <div className="flex items-center justify-between p-6 bg-white border border-slate-400/60 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all group cursor-pointer h-full">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Dispatched Pass Log</h3>
                <p className="text-sm text-slate-500 mt-2">Track your locally registered guest entries, monitor pending clearances, and confirm exits.</p>
                <span className="text-blue-500 text-sm font-medium mt-4 inline-block group-hover:underline">View Recent Dispatch →</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border border-blue-200 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                <FileText className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">View Log</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white border border-slate-400/80 rounded-xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-400/60 bg-white flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Your Shift Activity Log</h3>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              <div className="flex space-x-6 text-sm font-medium">
                {(['All Visitors', 'Pre-Scheduled', 'Repeated', 'Expired'] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setCurrentTab(tab)}
                    className={`pb-2 border-b-2 transition-colors font-semibold ${
                      currentTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <SearchFilterMatrix 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedFilters={selectedFilters}
                onFilterToggle={handleFilterToggle}
                filterBuckets={filterBuckets}
                placeholder="Search name or registry ID..."
              />
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[200px]">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <p className="text-slate-500 font-medium animate-pulse">Syncing logs...</p>
              </div>
            ) : null}
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-400/60 font-semibold">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">REGISTRY ID</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">VISITOR IDENTIFICATION</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">PIPELINE ARCHITECTURE</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">CLASSIFICATION UNIT</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">REQUEST TIMESTAMP</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">STATUS BADGE</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider text-center">ACTION SHELLS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400/60 font-medium">
                {visibleRows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No records matched the selected query metrics.</td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
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
                        {row.status === 'Cleared' && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs rounded font-bold">Cleared</span>}
                        {row.status === 'Pending' && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-xs rounded font-bold">Pending</span>}
                        {row.status === 'Expired' && <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs rounded font-bold">Expired</span>}
                        {row.status === 'Denied' && <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 text-xs rounded font-bold">Denied</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5 relative">
                          <button 
                            onClick={() => { setSelectedVisitor(row); setIsDetailDrawerOpen(true); }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => { setFormName(row.visitorName); setIsRegModalOpen(true); }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <div className="relative">
                            <button onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuId === row.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-400/80 rounded-xl shadow-lg py-1.5 z-20 text-left text-xs font-semibold text-slate-700">
                                  <button onClick={() => { alert(`Editing context logic initialized for token field: ${row.id}`); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700">Edit Info</button>
                                  <button onClick={() => handleRevoke(row.id)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-rose-600 border-t border-slate-100">Revoke Request</button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- REGISTRATION MODAL --- */}
        {isRegModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => !isSubmitting && setIsRegModalOpen(false)}></div>
            <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-400/80 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-5 border-b border-slate-400/60 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">Security Pass Request</h2>
                <button onClick={() => !isSubmitting && setIsRegModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">VISITOR FULL NAME</label>
                  <input type="text" required disabled={isSubmitting} value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Rahul Verma" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PHONE NUMBER</label>
                  <input type="tel" required disabled={isSubmitting} value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="+91..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">EMAIL ADDRESS (OPTIONAL)</label>
                  <input type="email" disabled={isSubmitting} value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PURPOSE OF VISIT</label>
                  <input type="text" disabled={isSubmitting} value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="Brief reason for access..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIPELINE TYPE</label>
                  <select disabled={isSubmitting} value={formPipeline} onChange={(e) => setFormPipeline(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white">
                    <option>Immediate Access / Live Walk-in</option>
                    <option>Pre-Scheduled Visit</option>
                    <option>Repeated Visitor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">DEPARTMENT CLASSIFICATION</label>
                  <select disabled={isSubmitting} value={formClassification} onChange={(e) => setFormClassification(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white">
                    <option>IT Department</option>
                    <option>Cyber Security Unit</option>
                    <option>Logistics Division</option>
                    <option>Human Resources</option>
                    <option>General Unit</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <button type="button" disabled={isSubmitting} onClick={() => setIsRegModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-slate-900 text-white font-semibold text-sm rounded-lg disabled:opacity-50 flex items-center">
                    {isSubmitting ? 'Processing...' : 'Submit Pass'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- DETAIL PREVIEW DRAWER --- */}
        {isDetailDrawerOpen && selectedVisitor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDetailDrawerOpen(false)}></div>
            <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-400/80 flex flex-col overflow-hidden animate-fade-in">
              
              <div className="p-5 border-b border-slate-400/60 bg-slate-50 text-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Complete Access Registry Profile</h3>
                  <p className="text-xs text-slate-500 mt-1">Pass ID Reference: <span className="text-blue-600 font-bold">{selectedVisitor.id}</span></p>
                </div>
                <button onClick={() => setIsDetailDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
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

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-slate-400/60 shadow-xs flex flex-col justify-center text-center text-slate-400 border-dashed min-h-[180px]">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <span className="font-bold text-slate-600 text-xs break-all">encrypted_identity_token.pdf</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Secure View Matrix Active</span>
                </div>
              </div>

              <div className="p-4 border-t border-slate-400/60 bg-white flex justify-between items-center">
                <span className="text-xs text-slate-500 flex items-center font-medium"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> Clearance check processed. Ledger validated.</span>
                <button 
                  onClick={() => { setIsDetailDrawerOpen(false); setFormName(selectedVisitor.visitorName); setIsRegModalOpen(true); }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-Register & Autofill
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </DashboardLayout>
  );
}