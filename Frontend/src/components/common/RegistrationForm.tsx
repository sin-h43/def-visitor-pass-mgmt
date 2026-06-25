// pages/emp/index.tsx
import { useState, useMemo, useEffect } from 'react';
import { UserPlus, FileText, AlertCircle, X, User, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterMatrix from '../../components/common/SearchFilterMatrix';
import VisitorTable  from '../../components/common/eVisitorTable';
import type { VisitorRecord } from '../../components/common/eVisitorTable';
import { supabase } from '../../lib/supabase';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

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
    department: []
  });

  const fetchMyVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select(`
          visit_id,
          visit_type,
          department,
          purpose,
          status,
          hr_remarks, /* FETCHES THE HR COMMENT */
          start_date,
          created_at,
          visitors (visitor_id,gender, name, phone,document_url,  address, email, dob, organization, designation, id_type, id_number, nationality),
          escorts(name,phone,id_number, id_type)
        `)
        .eq('host_employee_id', currentUser.empId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const transformed: VisitorRecord[] = data.map((row: any) => {
          let uiPipeline = 'Walk-in';
          if (row.visit_type === 'PRESCHEDULED') uiPipeline = 'Pre-Scheduled';
          if (row.visit_type === 'REPEATED') uiPipeline = 'Repeated';

          const escortsArray = Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []);
          
          return {
            id: row.visit_id,
            visitorName: row.visitors?.name || 'Unknown',
            phone: row.visitors?.phone || 'N/A',
            email: row.visitors?.email || 'N/A',
            dob: row.visitors?.dob || 'N/A',
            id_type: row.visitors?.id_type || 'Govt ID',
            id_number: row.visitors?.id_number || 'N/A',
            address: row.visitors?.address || 'N/A',
            pipeline: uiPipeline,
            department: row.department || "General Unit",
            purpose: row.purpose || 'General Entry',
            documentUrl: row.visitors?.document_url || null,
            hostName: currentUser.name,
            hostDept: currentUser.dept,
            escorts: escortsArray,
            requestDate: new Date(row.start_date || row.created_at).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            status: row.status === 'Approved' ? 'Cleared' : row.status,
            organization: row.visitors?.organization || 'N/A',
            created_at: row.visitors?.created_at,
            hr_remarks: row.hr_remarks || '' // MAPS THE COMMENT TO THE UI
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

  const filterBuckets = [
    {
      key: 'pipeline',
      title: 'Visit Type',
      options: [
        { label: 'Walk-in', value: 'Walk-in' },
        { label: 'Pre-Scheduled', value: 'Pre-Scheduled' },
        { label: 'Repeated', value: 'Repeated' },
      ]
    },
    {
      key: 'status',
      title: 'Status',
      options: [
        { label: 'Cleared', value: 'Cleared' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Expired', value: 'Expired' },
      ]
    },
    {
      key: 'department',
      title: 'Department',
      options: [
        { label: 'Research Wing', value: 'Research Wing' },
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
      if (currentTab === 'Pre-Scheduled' && item.pipeline !== 'Pre-Scheduled') return false;
      if (currentTab === 'Repeated' && item.pipeline !== 'Repeated') return false;
      if (currentTab === 'Expired' && item.status !== 'Expired') return false;

      if (searchTerm) {
        const lowerQuery = searchTerm.toLowerCase();
        if (!item.visitorName.toLowerCase().includes(lowerQuery) && !item.id.toLowerCase().includes(lowerQuery)) return false;
      }

      for (const key of Object.keys(selectedFilters)) {
        const selectedValues = selectedFilters[key];
        if (selectedValues.length > 0 && !selectedValues.some(val => String(val) === String(item[key as keyof VisitorRecord]))) return false;
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

  const handleRevoke = async (visitId: string) => {
    if(!window.confirm("Are you sure you want to revoke this pass request?")) return;
    try {
      const { error } = await supabase.from('visits').update({ status: 'Revoked' }).eq('visit_id', visitId);
      if (error) throw error;
      setShiftData(prev => prev.map(x => x.id === visitId ? { ...x, status: 'Revoked' } : x));
    } catch (err) {
      console.error("Failed to revoke pass:", err);
      alert("Failed to revoke pass request.");
    }
  };

  // CORRECT & RESEND LOGIC: Routes to the form with `isEdit: true`
  const handleEdit = (visitor: VisitorRecord) => {
    navigate('/emp/add_visitor', { state: { autofill: visitor, isEdit: true } });
  }

  const handleReRegister = (visitor: VisitorRecord) => {
    navigate('/emp/add_visitor', { state: { autofill: visitor } });
  };

  const handleView = (visitor: VisitorRecord) => {
    setSelectedVisitor(visitor);
    setIsDrawerOpen(true);
  };

  // ISOLATES DENIED VISITS FOR THE DASHBOARD BANNER
  const deniedVisits = shiftData.filter(v => v.status === 'Denied');

  return (
    <DashboardLayout role="emp" userName={currentUser.name}>
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back, {currentUser.name}!</h1>
          <p className="text-sm text-slate-500">Gate 1 Reception • Entry Dashboard</p>
        </div>

        {/* ACTION REQUIRED BANNER: Shows Declined Requests + HR Comments immediately */}
        {deniedVisits.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-rose-700 flex items-center mb-3 uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 mr-2" /> Requires Attention: Declined Requests
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deniedVisits.map(visit => (
                <div key={visit.id} className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div>
                      <h4 className="font-bold text-rose-950 text-sm truncate">{visit.visitorName}</h4>
                      <p className="text-[11px] text-rose-700 font-mono mt-0.5">{visit.id}</p>
                    </div>
                    <span className="px-2 py-1 bg-rose-100 text-rose-800 text-[10px] uppercase font-bold rounded">Denied</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-rose-100 mb-4 ml-2">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">HR Rejection Remark:</span>
                    <p className="text-xs text-slate-700 font-medium italic">"{visit.hr_remarks || 'No specific reason provided.'}"</p>
                  </div>
                  <div className="ml-2">
                    <button 
                      onClick={() => handleEdit(visit)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      Correct & Resend Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div onClick={() => navigate('/emp/add_visitor')} className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group cursor-pointer">
            <div>
              <h3 className="text-lg font-semibold text-blue-400">New Visitor Request</h3>
              <p className="text-sm text-slate-400 mt-2">Create a new gate pass request or pre-schedule an upcoming visit.</p>
              <span className="text-blue-400 text-sm font-medium mt-4 inline-block group-hover:text-blue-500">Open Form →</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border border-blue-100 bg-blue-50 rounded-lg text-blue-600 shrink-0">
              <UserPlus className="w-8 h-8 mb-2" />
              <span className="font-semibold text-sm">Add Visitor</span>
            </div>
          </div>

          <Link to="/emp/dispatchedlogs" className="block">
            <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group cursor-pointer h-full">
              <div>
                <h3 className="text-lg font-semibold text-amber-400">Pass History Logs</h3>
                <p className="text-sm text-slate-500 mt-2">View previously dispatched passes, expired credentials, and exit logs.</p>
                <span className="text-amber-400 text-sm font-medium mt-4 inline-block group-hover:text-amber-500">View Logs →</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border border-slate-200 bg-amber-50 rounded-lg text-amber-500 shrink-0">
                <FileText className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">View History</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-white flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Active Requests & Shift Log</h3>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              <div className="flex space-x-6 text-sm font-medium">
                {(['All Visitors', 'Pre-Scheduled', 'Repeated', 'Expired'] as const).map(tab => (
                  <button key={tab} onClick={() => setCurrentTab(tab)} className={`pb-2 border-b-2 transition-colors font-semibold ${currentTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <SearchFilterMatrix searchTerm={searchTerm} onSearchChange={setSearchTerm} selectedFilters={selectedFilters} onFilterToggle={handleFilterToggle} filterBuckets={filterBuckets} placeholder="Search name or ID..." />
            </div>
          </div>

          {/* Renders your eVisitorTable component */}
          <VisitorTable 
            data={visibleRows} 
            loading={loading}
            onEdit={handleEdit}
            onRevoke={handleRevoke}
            onReRegister={handleReRegister}
            onView = { handleView}
          />
        </div>

        {/* EMP READ-ONLY SLIDE-OUT DRAWER */}
        {isDrawerOpen && selectedVisitor && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
            
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Clearance Status</h2>
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedVisitor.id}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" /> Visitor Identity
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Full Name</span><span className="col-span-2 font-bold text-slate-900">{selectedVisitor.visitorName}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Phone</span><span className="col-span-2 font-medium text-slate-900 font-mono">{selectedVisitor.phone}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Email</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.email}</span></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <Building className="w-4 h-4 mr-2 text-blue-600" /> Purpose of Visit
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Pipeline</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.pipeline}</span></div>
                    <div>
                      <span className="text-slate-500 block mb-1 mt-2">Declared Purpose</span>
                      <div className="bg-white p-3 border border-slate-200 rounded-lg leading-relaxed shadow-sm text-slate-800 text-xs font-medium">
                        {selectedVisitor.purpose}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* READ ONLY REMARKS PANEL & RESEND BUTTON IN DRAWER */}
              <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  HR Review Commentary
                </label>
                <div className="w-full p-4 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 whitespace-pre-wrap min-h-[80px]">
                  {selectedVisitor.hr_remarks ? (
                    <span className="italic">"{selectedVisitor.hr_remarks}"</span>
                  ) : (
                    <span className="text-slate-400 italic">No notes left by HR for this request.</span>
                  )}
                </div>
                {selectedVisitor.status === 'Denied' && (
                  <button onClick={() => { setIsDrawerOpen(false); handleEdit(selectedVisitor); }} className="mt-4 w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-colors">
                    Correct & Resend Request
                  </button>
                )}
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