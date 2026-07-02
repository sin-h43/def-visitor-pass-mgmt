import { useState, useMemo, useEffect } from 'react';
import { UserPlus, FileText, AlertCircle, X, User, Building, Bell, Send, CheckCircle, Clock, LogOut } from 'lucide-react'; 
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterMatrix from '../../components/common/SearchFilterMatrix';
import VisitorTable  from '../../components/common/eVisitorTable';
import type { VisitorRecord as BaseVisitorRecord } from '../../components/common/eVisitorTable';
import { supabase } from '../../lib/supabase';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils'; 

// Extend VisitorRecord to include actual_out and checked_in_time properties
type VisitorRecord = BaseVisitorRecord & {
  actual_out?: string;
  checked_in_time?: string;
};

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [ignoredNotificationIds, setIgnoredNotificationIds] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: '', empId: '', name: '', dept: '' });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUser({ 
            id: emp.id,             
            empId: emp.employee_id, 
            name: emp.name, 
            dept: emp.department || 'General Unit' 
          });
        } catch (error) {
          console.error("Failed to load employee identity", error);
        }
      }
    };
    fetchUser();
  }, []);

  const [currentTab, setCurrentTab] = useState<'All Visitors' | 'Pre-Scheduled' | 'Repeated' | 'Expired'>('All Visitors');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({ pipeline: [], status: [], department: [] });

  const fetchMyVisits = async () => {
    if (!currentUser.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select(`
          visit_id, visit_type, department, purpose, status, hr_remarks, start_date, end_date, created_at, actual_out,
          visitors (visitor_id, gender, name, phone, document_url, address, email, dob, organization, designation, id_type, id_number, nationality, checked_in_time, checked_out_time),
          escorts(name,phone,id_number,id_type,email,gender)
        `)
        .or(`host_employee_id.eq.${currentUser.empId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const transformed: VisitorRecord[] = data.map((row: any) => {
          let uiPipeline = 'Walk-in';
          if (row.visit_type === 'PRESCHEDULED' || row.visit_type?.toLowerCase() === 'scheduled') uiPipeline = 'Pre-Scheduled';
          if (row.visit_type === 'REPEATED' || row.visit_type?.toLowerCase() === 'repeated') uiPipeline = 'Repeated';

          const escortsArray = Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []);
          
          // ✅ FIX: Bulletproof Status Mapping & Dynamic Expiration
          const rawStatus = (row.status || 'Pending').toLowerCase();
          let currentStatus = 'Pending';
          
          if (rawStatus === 'approved') currentStatus = 'Cleared'; // UI expects 'Cleared'
          else if (rawStatus === 'denied') currentStatus = 'Denied';
          else if (rawStatus === 'active') currentStatus = 'Active';
          else if (rawStatus === 'completed') currentStatus = 'Completed';
          else if (rawStatus === 'revoked') currentStatus = 'Revoked';

          // Dynamically check if the pass time has expired
          if ((currentStatus === 'Cleared' || currentStatus === 'Pending') && row.end_date) {
            if (new Date() > new Date(row.end_date)) {
              currentStatus = 'Expired';
            }
          }
          
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
            status: currentStatus,
            organization: row.visitors?.organization || 'N/A',
            created_at: row.created_at,
            hr_remarks: row.hr_remarks || '',
            actual_out: row.actual_out,
            checked_in_time: row.visitors?.checked_in_time
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
  }, [currentUser.id]);

  const filterBuckets = [
    { key: 'pipeline', title: 'Visit Type', options: [{ label: 'Walk-in', value: 'Walk-in' }, { label: 'Pre-Scheduled', value: 'Pre-Scheduled' }, { label: 'Repeated', value: 'Repeated' }] },
    // ✅ FIX: Realigned bucket filters to strictly match UI expectations
    { key: 'status', title: 'Status', options: [{ label: 'Cleared', value: 'Cleared' }, { label: 'Active', value: 'Active' }, { label: 'Pending', value: 'Pending' }, { label: 'Denied', value: 'Denied' }, { label: 'Completed', value: 'Completed' }, { label: 'Expired', value: 'Expired' }] }
  ];

  const visibleRows = useMemo(() => {
    return shiftData.filter(item => {
      if (currentTab === 'Pre-Scheduled' && item.pipeline !== 'Pre-Scheduled') return false;
      if (currentTab === 'Repeated' && item.pipeline !== 'Repeated') return false;
      // ✅ FIX: The Expired tab will now perfectly catch dynamically generated expired status
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
      const updatedSelection = currentSelection.includes(value) ? currentSelection.filter(item => item !== value) : [...currentSelection, value];
      return { ...prev, [bucketKey]: updatedSelection };
    });
  };

  const handleRevoke = async (visitId: string) => {
    if(!window.confirm("Are you sure you want to revoke this pass request?")) return;
    try {
      const { error } = await supabase.from('visits').update({ status: 'Revoked' }).eq('visit_id', visitId);
      if (error) throw error;
      setShiftData(prev => prev.map(x => x.id === visitId ? { ...x, status: 'Revoked' } : x));
    } catch (err) { alert("Failed to revoke pass request."); }
  };

  const handleEdit = (visitor: VisitorRecord) => navigate('/emp/add_visitor', { state: { autofill: visitor, isEdit: true } });
  const handleReRegister = (visitor: VisitorRecord) => navigate('/emp/add_visitor', { state: { autofill: visitor } });
  const handleView = (visitor: VisitorRecord) => { setSelectedVisitor(visitor); setIsDrawerOpen(true); };
  const handleIgnoreNotification = (id: string) => setIgnoredNotificationIds(prev => [...prev, id]);

  const activeNotifications = useMemo(() => {
    return shiftData.filter(v => {
      if (ignoredNotificationIds.includes(v.id)) return false;
      
      // ✅ FIX: Restored 'Cleared' flag for the notification listener
      const notifyStatuses = ['Denied', 'Cleared', 'Active', 'Completed'];
      if (!notifyStatuses.includes(v.status)) return false;

      if (v.status === 'Completed' && v.actual_out) {
        const outTime = new Date(v.actual_out).getTime();
        const twelveHoursAgo = new Date().getTime() - (12 * 60 * 60 * 1000);
        if (outTime < twelveHoursAgo) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.status === 'Denied') return -1;
      if (b.status === 'Denied') return 1;
      if (a.status === 'Active') return -1;
      if (b.status === 'Active') return 1;
      return 0;
    });
  }, [shiftData, ignoredNotificationIds]);

  return (
    <DashboardLayout 
      role="emp" 
      userName={currentUser.name}
      headerAction={
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            className="relative p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Bell className="w-5 h-5 text-slate-700" />
            {activeNotifications.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white border-2 border-white shadow-sm animate-pulse">
                {activeNotifications.length > 9 ? '9+' : activeNotifications.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in text-left flex flex-col max-h-[80vh]">
                <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm">Status Updates</h3>
                  <span className="text-[10px] font-bold text-slate-500">{activeNotifications.length} NEW</span>
                </div>
                <div className="overflow-y-auto bg-white flex-1 p-3 space-y-3 custom-scrollbar">
                  {activeNotifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No new status updates.</p>
                  ) : (
                    activeNotifications.map(visit => {
                      let nIcon = <Clock className="w-4 h-4" />;
                      let nColor = 'bg-slate-50 text-slate-600 border-slate-200';
                      let nTitle = 'Update Pending';
                      let nDesc = '';

                      if (visit.status === 'Denied') {
                        nIcon = <AlertCircle className="w-4 h-4 text-rose-600" />;
                        nColor = 'bg-rose-50 border-rose-200';
                        nTitle = 'Request Rejected';
                        nDesc = `Feedback: "${visit.hr_remarks || 'Policy conflict or identity mismatch.'}"`;
                      } else if (visit.status === 'Cleared') {
                        nIcon = <CheckCircle className="w-4 h-4 text-emerald-600" />;
                        nColor = 'bg-emerald-50 border-emerald-200';
                        nTitle = 'HR Clearance Granted';
                        nDesc = 'Pass generated. Awaiting visitor arrival.';
                      } else if (visit.status === 'Active') {
                        nIcon = <User className="w-4 h-4 text-blue-600" />;
                        nColor = 'bg-blue-50 border-blue-200';
                        nTitle = 'Visitor Arrived';
                        nDesc = `Checked in at ${visit.checked_in_time ? new Date(visit.checked_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'the gate'}.`;
                      } else if (visit.status === 'Completed') {
                        nIcon = <LogOut className="w-4 h-4 text-slate-600" />;
                        nColor = 'bg-slate-100 border-slate-300';
                        nTitle = 'Visitor Departed';
                        nDesc = `Checked out at ${visit.actual_out ? new Date(visit.actual_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'the gate'}.`;
                      }

                      return (
                        <div key={visit.id} className={`border rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden ${nColor}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {nIcon}
                              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">{nTitle}</span>
                            </div>
                            <button onClick={() => handleIgnoreNotification(visit.id)} className="text-slate-400 hover:text-slate-700 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">{visit.visitorName} <span className="text-[10px] font-mono text-slate-500 font-normal ml-1">({visit.id})</span></div>
                            <p className="text-xs mt-1 text-slate-700 leading-snug">{nDesc}</p>
                          </div>
                          {visit.status === 'Denied' && (
                            <button 
                              onClick={() => { setShowNotifications(false); handleEdit(visit); }} 
                              className="mt-2 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Send className="w-3.5 h-3.5" /> Fix & Resend Request
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      }
    >
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome Back, {currentUser.name}!</h1>
            <p className="text-sm text-slate-500">Your Personal Host & Dispatch Dashboard</p>
          </div>
        </div>

        {/* Action Cards */}
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

        {/* Shift Ledger */}
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
          <VisitorTable data={visibleRows} loading={loading} onEdit={handleEdit} onRevoke={handleRevoke} onReRegister={handleReRegister} onView={handleView} />
        </div>

        {/* Visitor Drawer Component */}
        {isDrawerOpen && selectedVisitor && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Clearance Status</h2>
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedVisitor.id}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center"><User className="w-4 h-4 mr-2 text-blue-600" /> Visitor Identity</h3>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Full Name</span><span className="col-span-2 font-bold text-slate-900">{selectedVisitor.visitorName}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Phone</span><span className="col-span-2 font-medium text-slate-900 font-mono">{selectedVisitor.phone}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Email</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.email}</span></div>
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center"><Building className="w-4 h-4 mr-2 text-blue-600" /> Purpose of Visit</h3>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Pipeline</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.pipeline}</span></div>
                    <div>
                      <span className="text-slate-500 block mb-1 mt-2">Declared Purpose</span>
                      <div className="bg-white p-3 border border-slate-200 rounded-lg leading-relaxed shadow-sm text-slate-800 text-xs font-medium">{selectedVisitor.purpose}</div>
                    </div>
                  </div>
                </section>
              </div>
              <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HR Review Commentary</label>
                <div className="w-full p-4 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 whitespace-pre-wrap min-h-[80px]">
                  {selectedVisitor.hr_remarks ? <span className="italic">"{selectedVisitor.hr_remarks}"</span> : <span className="text-slate-400 italic">No notes left by HR for this request.</span>}
                </div>
                {selectedVisitor.status === 'Denied' && (
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => { setIsDrawerOpen(false); handleIgnoreNotification(selectedVisitor.id); }} className="w-1/3 py-2.5 border border-slate-200 font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-xs">Dismiss</button>
                    <button onClick={() => { setIsDrawerOpen(false); handleEdit(selectedVisitor); }} className="w-2/3 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-colors text-xs">Correct & Resend</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}