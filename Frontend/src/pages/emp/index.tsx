// pages/emp/index.tsx
import { useState, useMemo, useEffect } from 'react';
import { UserPlus, FileText, AlertCircle, X, User, Building, Bell, Send } from 'lucide-react'; // Added notification icons
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

  // Added state to track ignored notification IDs locally so employees can dismiss them
  const [ignoredNotificationIds, setIgnoredNotificationIds] = useState<string[]>([]);

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
          hr_remarks,
          start_date,
          created_at,
          visitors (visitor_id,gender, name, phone,document_url,  address, email, dob, organization, designation, id_type, id_number, nationality),
          escorts(name,phone,id_number,id_type,email,gender)
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
            gender: row.visitors?.gender || 'N/A',
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
            // Cleaned trailing spaces matching to ensure exact filtering string comparisons
            status: row.status === 'Approved' ? 'Cleared' : (row.status === 'Denied' ? 'Denied' : row.status),
            organization: row.visitors?.organization || 'N/A',
            created_at: row.visitors?.created_at,
            hr_remarks: row.hr_remarks || '' 
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
        { label: 'Denied', value: 'Denied' },
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

  const handleEdit = (visitor: VisitorRecord) => {
    // Navigates directly into the Registry Form with autofill variables intact
    navigate('/emp/add_visitor', { state: { autofill: visitor, isEdit: true } });
  }

  const handleReRegister = (visitor: VisitorRecord) => {
    navigate('/emp/add_visitor', { state: { autofill: visitor } });
  };

  const handleView = (visitor: VisitorRecord) => {
    setSelectedVisitor(visitor);
    setIsDrawerOpen(true);
  };

  // Filter active notifications that have not been explicitly hidden via the ignore button
  const activeNotifications = useMemo(() => {
    return shiftData.filter(v => v.status.trim() === 'Denied' && !ignoredNotificationIds.includes(v.id));
  }, [shiftData, ignoredNotificationIds]);

  const handleIgnoreNotification = (id: string) => {
    setIgnoredNotificationIds(prev => [...prev, id]);
  };

  return (
    <DashboardLayout role="emp" userName={currentUser.name}>
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome Back, {currentUser.name}!</h1>
            <p className="text-sm text-slate-500">Gate 1 Reception • Entry Dashboard</p>
          </div>
        </div>

        {/* IT WORKFLOW STYLE ACTIONABLE NOTIFICATION PANEL */}
        {activeNotifications.length > 0 && (
          <div className="mb-8 border border-slate-200 bg-slate-50/50 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-wider">
                <Bell className="w-4 h-4 mr-2 text-rose-500 animate-pulse" /> System Notifications ({activeNotifications.length})
              </h3>
              <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">Requires Attention</span>
            </div>
            
            <div className="space-y-3">
              {activeNotifications.map(visit => (
                <div key={visit.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-slate-300 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 h-full w-1.5 bg-rose-500"></div>
                  
                  <div className="flex items-start gap-3 pl-2 max-w-xl">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">{visit.visitorName}</h4>
                        <span className="text-[10px] font-mono text-slate-400">({visit.id})</span>
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold text-[9px] uppercase rounded">Request Rejected</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">HR Feedback: </span>
                        <span className="italic">"{visit.hr_remarks || 'Identity credential mismatch or policy conflict.'}"</span>
                      </p>
                    </div>
                  </div>

                  {/* Operational Action Row Buttons */}
                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0 justify-end">
                    <button 
                      onClick={() => handleIgnoreNotification(visit.id)}
                      className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Dismiss
                    </button>
                    <button 
                      onClick={() => handleEdit(visit)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3 h-3" /> Resend Request
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
              <h3 className="text-lg font-semibold text-blue-500">New Visitor Request</h3>
              <p className="text-sm text-slate-400 mt-2">Create a new gate pass request or pre-schedule an upcoming visit.</p>
              <span className="text-blue-500 text-sm font-medium mt-4 inline-block group-hover:text-blue-600">Open Form →</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border border-blue-100 bg-blue-50 rounded-lg text-blue-600 shrink-0">
              <UserPlus className="w-8 h-8 mb-2" />
              <span className="font-semibold text-sm">Add Visitor</span>
            </div>
          </div>

          <Link to="/emp/dispatchedlogs" className="block">
            <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group cursor-pointer h-full">
              <div>
                <h3 className="text-lg font-semibold text-amber-500">Pass History Logs</h3>
                <p className="text-sm text-slate-500 mt-2">View previously dispatched passes, expired credentials, and exit logs.</p>
                <span className="text-amber-400 text-sm font-medium mt-4 inline-block group-hover:text-amber-600">View Logs →</span>
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

          <VisitorTable 
            data={visibleRows} 
            loading={loading}
            onEdit={handleEdit}
            onRevoke={handleRevoke}
            onReRegister={handleReRegister}
            onView={handleView}
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

              {/* ACTION REMARKS PANEL */}
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
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => { setIsDrawerOpen(false); handleIgnoreNotification(selectedVisitor.id); }}
                      className="w-1/3 py-2.5 border border-slate-200 font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-xs"
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={() => { setIsDrawerOpen(false); handleEdit(selectedVisitor); }} 
                      className="w-2/3 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-colors text-xs"
                    >
                      Correct & Resend
                    </button>
                  </div>
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