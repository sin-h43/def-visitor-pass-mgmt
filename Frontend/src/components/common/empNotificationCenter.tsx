import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, User, Bell, Send, CheckCircle, Clock, LogOut, Check, MailOpen, CheckSquare } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils'; 

export default function EmpNotificationCenter() {
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: '', empId: '', name: '', dept: '' });

  // ✅ UPGRADE: Track "Read" status and persist it in the browser's Local Storage
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('emp_read_notifs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('emp_read_notifs', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUser({ id: emp.id, empId: emp.employee_id, name: emp.name, dept: emp.department || 'General Unit' });
        } catch (error) {
          console.error("Failed to load employee identity", error);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!currentUser.empId) return;
    const fetchMyVisits = async () => {
      try {
        const { data, error } = await supabase
          .from('visits')
          .select(`
            visit_id, visit_type, department, purpose, status, hr_remarks, start_date, end_date, created_at, actual_out,
            visitors (visitor_id, gender, name, phone, document_url, address, email, dob, organization, designation, id_type, id_number, nationality, checked_in_time, checked_out_time),
            escorts(name,phone,id_number,id_type,email,gender)
          `)
          .eq('host_employee_id', currentUser.empId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;
        if (data) {
          const transformed = data.map((row: any) => {
            let uiPipeline = 'Walk-in';
            if (row.visit_type === 'PRESCHEDULED' || row.visit_type?.toLowerCase() === 'scheduled') uiPipeline = 'Pre-Scheduled';
            if (row.visit_type === 'REPEATED' || row.visit_type?.toLowerCase() === 'repeated') uiPipeline = 'Repeated';

            const rawStatus = (row.status || 'Pending').toLowerCase();
            let currentStatus = 'Pending';
            if (rawStatus === 'approved') currentStatus = 'Cleared'; 
            else if (rawStatus === 'denied') currentStatus = 'Denied';
            else if (rawStatus === 'active') currentStatus = 'Active';
            else if (rawStatus === 'completed') currentStatus = 'Completed';
            
            if ((currentStatus === 'Cleared' || currentStatus === 'Pending') && row.end_date) {
              if (new Date() > new Date(row.end_date)) currentStatus = 'Expired';
            }
            
            return {
              id: row.visit_id, visitorName: row.visitors?.name || 'Unknown', gender: row.visitors?.gender || 'N/A',
              phone: row.visitors?.phone || 'N/A', email: row.visitors?.email || 'N/A', dob: row.visitors?.dob || 'N/A',
              id_type: row.visitors?.id_type || 'Govt ID', id_number: row.visitors?.id_number || 'N/A', address: row.visitors?.address || 'N/A',
              pipeline: uiPipeline, department: row.department || "General Unit", purpose: row.purpose || 'General Entry',
              documentUrl: row.visitors?.document_url || null, hostName: currentUser.name, hostDept: currentUser.dept,
              escorts: Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []),
              requestDate: new Date(row.start_date || row.created_at).toLocaleString('en-GB'),
              status: currentStatus, organization: row.visitors?.organization || 'N/A',
              created_at: row.created_at, hr_remarks: row.hr_remarks || '', actual_out: row.actual_out, checked_in_time: row.visitors?.checked_in_time
            };
          });
          setShiftData(transformed);
        }
      } catch (err) { console.error("Error fetching notifications:", err); }
    };
    
    fetchMyVisits();
    const interval = setInterval(fetchMyVisits, 30000); 
    return () => clearInterval(interval);
  }, [currentUser.empId]);

  // ✅ Toggle Read/Unread State
  const toggleReadStatus = (id: string) => {
    setReadNotificationIds(prev => 
      prev.includes(id) ? prev.filter(nid => nid !== id) : [...prev, id]
    );
  };

  const markAllAsRead = () => {
    const allIds = activeNotifications.map(n => n.id);
    setReadNotificationIds(prev => Array.from(new Set([...prev, ...allIds])));
  };

  const activeNotifications = useMemo(() => {
    return shiftData.filter(v => {
      const notifyStatuses = ['Denied', 'Cleared', 'Active', 'Completed'];
      if (!notifyStatuses.includes(v.status)) return false;
      
      if (v.status === 'Completed' && v.actual_out) {
        const outTime = new Date(v.actual_out).getTime();
        const twelveHoursAgo = new Date().getTime() - (12 * 60 * 60 * 1000);
        if (outTime < twelveHoursAgo) return false;
      }
      return true;
    })
    .map(v => ({ ...v, isRead: readNotificationIds.includes(v.id) }))
    .sort((a, b) => {
      // 1. Sort Unread before Read
      if (a.isRead && !b.isRead) return 1;
      if (!a.isRead && b.isRead) return -1;
      // 2. Then sort by severity
      if (a.status === 'Denied') return -1;
      if (b.status === 'Denied') return 1;
      if (a.status === 'Active') return -1;
      if (b.status === 'Active') return 1;
      return 0;
    });
  }, [shiftData, readNotificationIds]);

  const unreadCount = activeNotifications.filter(n => !n.isRead).length;

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setShowNotifications(!showNotifications)} 
        className="relative p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white border-2 border-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-0 mt-3 w-[360px] sm:w-[420px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in text-left flex flex-col max-h-[85vh]">
            
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Shift Notifications</h3>
                <p className="text-[10px] text-slate-500 font-medium">{unreadCount} Unread Alerts</p>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center transition-colors bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                  <CheckSquare className="w-3 h-3 mr-1" /> Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto bg-white flex-1 p-3 space-y-3 custom-scrollbar">
              {activeNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">You're all caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No active visitor updates in this shift.</p>
                </div>
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
                    <div key={visit.id} className={`border rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden transition-all duration-300 ${visit.isRead ? 'bg-slate-50/50 border-slate-100 opacity-60 hover:opacity-100' : nColor}`}>
                      
                      {!visit.isRead && <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]"></div>}

                      <div className="flex justify-between items-start pl-3">
                        <div className="flex items-center gap-2">
                          {nIcon}
                          <span className={`font-bold text-xs uppercase tracking-wider ${visit.isRead ? 'text-slate-500' : 'text-slate-800'}`}>{nTitle}</span>
                        </div>
                        <button 
                          onClick={() => toggleReadStatus(visit.id)} 
                          className={`text-[10px] font-bold px-2 py-1 rounded transition-colors flex items-center ${visit.isRead ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-blue-600 bg-white/50 hover:bg-white border border-blue-100'}`}
                        >
                          {visit.isRead ? <><MailOpen className="w-3 h-3 mr-1"/> Unread</> : <><Check className="w-3 h-3 mr-1"/> Mark Read</>}
                        </button>
                      </div>
                      <div className="pl-3">
                        <div className={`font-bold text-sm ${visit.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{visit.visitorName} <span className="text-[10px] font-mono text-slate-400 font-normal ml-1">({visit.id})</span></div>
                        <p className={`text-xs mt-1 leading-snug ${visit.isRead ? 'text-slate-500' : 'text-slate-700'}`}>{nDesc}</p>
                      </div>
                      
                      {visit.status === 'Denied' && !visit.isRead && (
                        <button 
                          onClick={() => { setShowNotifications(false); navigate('/emp/add_visitor', { state: { autofill: visit, isEdit: true } }); }} 
                          className="mt-2 ml-3 mr-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
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
  );
}