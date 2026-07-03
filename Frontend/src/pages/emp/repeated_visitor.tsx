import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, RefreshCw, X, Shield, Calendar, UserCheck, Search, Building } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import type { TableColumn } from '../../types/visitor';
import { supabase } from '../../lib/supabase';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils'; // ✅ FIX: Added identity fetcher
import EmpNotificationCenter from '../../components/common/empNotificationCenter';

interface VisitHistory { visitId: string; date: string; rawDate: string; purpose: string; department: string; hostName: string; status: string; }
interface VisitorProfile { id: string; name: string; phone: string; email: string; nationality: string; organization: string; idType: string; idNumber: string; dob: string; address: string; docUrl: string | null; totalVisits: number; lastVisitDate: string; rawLastVisit: number; history: VisitHistory[]; }

export default function EmployeeRepeatedVisitorLogPage() {
  const navigate = useNavigate();
  const [directory, setDirectory] = useState<VisitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Visitors');
  
  // ✅ FIX: Store both IDs
  const [currentUser, setCurrentUser] = useState({ id: '', empId: '', name: '', dept: '', avatarUrl: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<VisitorProfile | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUser({ id: emp.id, empId: emp.employee_id, name: emp.name, dept: emp.department || 'General Unit', avatarUrl: emp.avatar_url || '' });
        } catch (e) {
          console.error("Failed to load emp profile", e);
        }
      }
    };
    fetchUser();
  }, []);

  const fetchVisitorDirectory = async () => {
    if (!currentUser.empId) return;
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('visits')
        .select(`
          visit_id, start_date, purpose, status, department,
          visitors(visitor_id, name, phone, email, nationality, organization, designation, dob, document_url, address, id_type, id_number),
          host:employees!visits_host_employee_id_fkey(name)
        `)
        // ✅ FIX: Fetch exclusively their own contact book!
        .eq('host_employee_id', currentUser.empId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const profileMap = new Map<string, VisitorProfile>();
        data.forEach((row: any) => {
          if (!row.visitors) return;
          const v = row.visitors;
          
          const visitRecord: VisitHistory = {
            visitId: row.visit_id,
            date: new Date(row.start_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            rawDate: row.start_date,
            purpose: row.purpose || 'General Entry',
            department: row.department || 'General Unit',
            hostName: row.host?.name || 'Unassigned',
            status: row.status
          };

          if (profileMap.has(v.visitor_id)) {
            const profile = profileMap.get(v.visitor_id)!;
            profile.history.push(visitRecord);
            profile.totalVisits += 1;
            const rowTime = new Date(row.start_date).getTime();
            if (rowTime > profile.rawLastVisit) {
              profile.lastVisitDate = visitRecord.date;
              profile.rawLastVisit = rowTime;
            }
          } else {
            profileMap.set(v.visitor_id, {
              id: v.visitor_id, name: v.name || 'Unknown', phone: v.phone || 'N/A', email: v.email || 'N/A',
              nationality: v.nationality || 'Indian', organization: v.organization || 'N/A', idType: v.id_type || 'Govt ID',
              idNumber: v.id_number || 'N/A', dob: v.dob || 'N/A', address: v.address || 'N/A', docUrl: v.document_url || null,
              totalVisits: 1, lastVisitDate: visitRecord.date, rawLastVisit: new Date(row.start_date).getTime(), history: [visitRecord]
            });
          }
        });
        setDirectory(Array.from(profileMap.values()).sort((a, b) => b.rawLastVisit - a.rawLastVisit));
      }
    } catch (error) { console.error('Error fetching visitor directory:', error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchVisitorDirectory(); }, [currentUser.empId]);

  const handleReRegister = (profile: VisitorProfile) => {
    setIsDrawerOpen(false);
    const cleanAutofill = {
      visitorId: profile.id, 
      visitorName: profile.name, phone: profile.phone, email: profile.email, dob: profile.dob,
      id_type: profile.idType, id_number: profile.idNumber, nationality: profile.nationality,
      organization: profile.organization, address: profile.address, documentUrl: profile.docUrl,
      pipeline: 'Repeated', purpose: '', department: '', escorts: []
    };
    navigate('/emp/add_visitor', { state: { autofill: cleanAutofill } });
  };

  const processedFilteredQueue = useMemo(() => {
    return directory.filter(row => {
      const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) || row.phone.includes(searchTerm);
      let matchesTab = true;
      if (activeTab === 'Frequent (2+ Visits)') matchesTab = row.totalVisits > 1;
      return matchesSearch && matchesTab;
    });
  }, [directory, searchTerm, activeTab]);

  const columns: TableColumn<VisitorProfile>[] = [
    { key: 'name', label: 'IDENTITY PROFILE', render: (row) => ( <div className="flex items-center space-x-3"> <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs"> {row.name.substring(0, 2).toUpperCase()} </div> <div> <div className="font-bold text-slate-800 text-sm">{row.name}</div> <div className="text-xs text-slate-500 font-mono">{row.phone}</div> </div> </div> ) },
    { key: 'organization', label: 'AFFILIATION', render: (row) => ( <div> <div className="text-slate-700 font-medium text-xs truncate max-w-[150px]" title={row.organization}>{row.organization}</div> <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{row.nationality}</div> </div> ) },
    { key: 'totalVisits', label: 'HISTORY VOLUME', render: (row) => ( <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${ row.totalVisits > 1 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200' }`}> {row.totalVisits} {row.totalVisits === 1 ? 'Visit' : 'Visits'} </span> ) },
    { key: 'lastVisitDate', label: 'LATEST ENTRY', render: (row) => <span className="text-slate-600 font-medium text-xs font-mono">{row.lastVisitDate}</span> },
    { key: 'actions', label: 'REGISTRY ACTIONS', render: (row) => ( <div className="flex items-center space-x-2"> <button onClick={() => { setSelectedProfile(row); setIsDrawerOpen(true); }} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center" > <History className="w-3 h-3 mr-1.5" /> History </button> <button onClick={() => handleReRegister(row)} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center" > <RefreshCw className="w-3 h-3 mr-1.5" /> Re-Register </button> </div> ) }
  ];

  if (loading) {
    return (
      <DashboardLayout role="emp" userName={currentUser.name} avatarUrl={currentUser.avatarUrl || ''}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-indigo-600 rounded-full mb-4"></div>
            <p className="text-slate-500 text-xs font-bold tracking-wide uppercase">Compiling My Registered Contacts...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="emp" userName={currentUser.name} headerAction={<EmpNotificationCenter />} avatarUrl={currentUser.avatarUrl || ''}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex items-center space-x-3">
          <div><h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Visitor Directory</h1><p className="text-sm text-slate-500">History ledger tracking identities you have previously hosted.</p></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center">
            <Search className="w-4 h-4 text-slate-400 mr-3 ml-2" />
            <input type="text" placeholder="Search my directory records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-slate-700 placeholder-slate-400" />
          </div>

          <div className="flex border-b border-slate-200 text-xs font-semibold space-x-4">
            {['All Visitors', 'Frequent (2+ Visits)'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 px-1 relative ${activeTab === tab ? 'text-indigo-600 font-bold border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}> {tab} </button>
            ))}
          </div>

          <DataTable data={processedFilteredQueue} columns={columns} />
        </div>

        {/* VISITOR HISTORY DRAWER */}
        {isDrawerOpen && selectedProfile && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div><h2 className="text-base font-bold text-slate-800">Identity Clearance Ledger</h2><p className="text-xs text-slate-400 font-mono mt-0.5">{selectedProfile.id}</p></div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-3 flex items-center"><Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Authorized Profile</h3>
                  <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-3 mb-4 border-b border-slate-100 pb-3">
                      <div className="w-10 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">{selectedProfile.name.substring(0, 2).toUpperCase()}</div>
                      <div><h4 className="font-bold text-slate-900 text-sm leading-tight">{selectedProfile.name}</h4><p className="text-[11px] font-medium text-slate-400 mt-0.5">{selectedProfile.organization}</p></div>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400 font-medium">Phone</span><span className="font-bold text-slate-800 font-mono">{selectedProfile.phone}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-medium">Email</span><span className="font-bold text-slate-800 font-mono break-all">{selectedProfile.email}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-medium">Nationality</span><span className="font-bold text-slate-800">{selectedProfile.nationality}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-medium">{selectedProfile.idType}</span><span className="font-bold text-slate-800 font-mono tracking-wide">{selectedProfile.idNumber}</span></div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-3 flex items-center justify-between">
                    <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> My Logged Timeline</span>
                    <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{selectedProfile.totalVisits} Session Passes</span>
                  </h3>
                  <div className="space-y-3">
                    {[...selectedProfile.history].reverse().map((visit, idx) => (
                      <div key={idx} className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          visit.status === 'Approved' || visit.status === 'Cleared' ? 'bg-emerald-500' :
                          visit.status === 'Pending' ? 'bg-amber-400' : 'bg-rose-500'
                        }`} />
                        <div className="flex justify-between items-center mb-2 pl-1"><span className="text-xs font-bold text-slate-800 font-mono">{visit.date}</span><span className="text-[10px] font-mono font-bold text-slate-400">{visit.visitId}</span></div>
                        <div className="pl-1 space-y-1 text-xs">
                          <div className="flex items-center text-slate-600 font-medium"><Building className="w-3 h-3 mr-1.5 text-slate-400" />{visit.department}</div>
                          <div className="flex items-center text-slate-600 font-medium"><UserCheck className="w-3 h-3 mr-1.5 text-slate-400" />Hosted by <span className="font-bold text-slate-800 ml-1">{visit.hostName}</span></div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 pl-1"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Objective Brief</span><p className="text-xs text-slate-700 font-medium italic">"{visit.purpose}"</p></div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}