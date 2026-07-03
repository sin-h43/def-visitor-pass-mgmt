import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, MailOpen, Check, CheckSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../hooks/useNotification';

interface PendingUser {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  status: string;
  created_at: string;
}

export default function HRNotificationCenter() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [liveAuditLogs, setLiveAuditLogs] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readLogs, setReadLogs] = useState<string[]>(JSON.parse(localStorage.getItem('readLogs') || '[]'));
  
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  // ==========================================
  // DATA FETCHING & POLLING
  // ==========================================
  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_registrations')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });
 
      if (error) return;
      if (data) setPendingUsers(data);
    } catch (err) {
      console.error('Exception fetching pending users:', err);
    }
  };

  const fetchLiveAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(15);
      
      if (error) throw error;
      if (data) setLiveAuditLogs(data);
    } catch (err) {
      console.error("Error fetching live audit logs:", err);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    fetchLiveAuditLogs();

    const interval = setInterval(() => {
      fetchPendingUsers();
      fetchLiveAuditLogs();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  const handleApproveEmployee = async (user: PendingUser) => {
    try {
      const generatedEmpId = `EMP-${Math.floor(10000 + Math.random() * 90000)}`;
      const { error: insertError } = await supabase.from('employees').insert([{
        employee_id: generatedEmpId,
        auth_id: user.auth_id,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: 'employee' 
      }]);
  
      if (insertError) throw insertError;
  
      const { error: updateError } = await supabase
        .from('employee_registrations')
        .update({ status: 'approved' })
        .eq('id', user.id);
  
      if (updateError) throw updateError;
  
      await supabase.from('audit_logs').insert([{
        action: 'account_approved',
        remarks: `HR authorized portal access for ${user.full_name} (${user.department})`,
        performed_by: 'HR Admin', 
        performed_by_role: 'hr'
      }]);
  
      addNotification('success', `Access approved for ${user.full_name}`);
      fetchPendingUsers(); 
      fetchLiveAuditLogs(); 
    } catch (error) {
      addNotification('error', "Failed to approve user. Check console for details.");
    }
  };

  const handleRejectEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to decline access for ${name}?`)) return;
    
    try {
      const { error: updateError } = await supabase
        .from('employee_registrations')
        .update({ status: 'rejected' })
        .eq('id', id);
  
      if (updateError) throw updateError;
  
      await supabase.from('audit_logs').insert([{
        action: 'account_rejected',
        remarks: `HR declined portal access request for ${name}.`,
        performed_by: 'HR Admin', 
        performed_by_role: 'hr'
      }]);
  
      addNotification('success', `Access declined for ${name}`);
      fetchPendingUsers();
      fetchLiveAuditLogs();
    } catch (error) {
      addNotification('error', "Failed to reject user. Check console for details.");
    }
  };

  // ✅ Toggle Read Status
  const toggleReadStatus = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    let newReadLogs;
    if (readLogs.includes(logId)) {
        newReadLogs = readLogs.filter(id => id !== logId);
    } else {
        newReadLogs = [...readLogs, logId];
    }
    setReadLogs(newReadLogs);
    localStorage.setItem('readLogs', JSON.stringify(newReadLogs));
  };

  const markAllAsRead = () => {
    const allLogIds = liveAuditLogs.map(log => log.id);
    const combined = Array.from(new Set([...readLogs, ...allLogIds]));
    setReadLogs(combined);
    localStorage.setItem('readLogs', JSON.stringify(combined));
  };

  const unreadAuditCount = liveAuditLogs.filter(log => !readLogs.includes(log.id)).length;
  const totalUnread = pendingUsers.length + unreadAuditCount;

  // Sort logs: unread first
  const sortedAuditLogs = [...liveAuditLogs].sort((a, b) => {
      const aRead = readLogs.includes(a.id);
      const bRead = readLogs.includes(b.id);
      if (aRead && !bRead) return 1;
      if (!aRead && bRead) return -1;
      return 0;
  });

  return (
    <div className="relative">
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white border-2 border-white shadow-sm animate-pulse">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-0 mt-3 w-[420px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden origin-top-right animate-fade-in text-left flex flex-col max-h-[85vh]">
            
            {/* Header Panel */}
            <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0 shadow-[0_4px_15px_-10px_rgba(0,0,0,0.05)] z-10">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                {totalUnread > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    {totalUnread} New
                  </span>
                )}
              </div>
              {unreadAuditCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center transition-colors bg-slate-50 hover:bg-blue-50 px-2 py-1 rounded-md border border-slate-100 hover:border-blue-100"
                >
                  <CheckSquare className="w-3 h-3 mr-1" /> Mark all read
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto custom-scrollbar bg-slate-50/50 flex-1">
              
              {/* 1. CRITICAL: PENDING APPROVALS */}
              {pendingUsers.length > 0 && (
                <div className="p-3 border-b border-slate-100 bg-blue-50/30">
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-3 px-1 flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse" />
                    Action Required ({pendingUsers.length})
                  </div>
                  <div className="space-y-2">
                    {pendingUsers.map(user => (
                      <div key={user.id} className="bg-white border border-blue-200/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-tight">{user.full_name}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleRejectEmployee(user.id, user.full_name)}
                            className="flex-1 py-1.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors"
                          >
                            Decline
                          </button>
                          <button 
                            onClick={() => handleApproveEmployee(user)}
                            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition-colors"
                          >
                            Approve Access
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. SYSTEM AUDIT LOGS */}
              {sortedAuditLogs.length > 0 && (
                <div className="p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    System Activity
                  </div>
                  <div className="space-y-2">
                    {sortedAuditLogs.map(log => {
                      const isRead = readLogs.includes(log.id);
                      return (
                        <div 
                          key={log.id} 
                          className={`relative group rounded-xl p-3 transition-all flex items-start gap-3 border ${
                            isRead 
                              ? 'bg-transparent border-transparent opacity-60 hover:opacity-100 hover:bg-slate-100' 
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}
                        >
                          {/* Unread Dot Indicator */}
                          {!isRead && (
                             <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]"></div>
                          )}

                          <div className="flex-1 min-w-0 pl-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className={`font-bold text-[11px] uppercase tracking-wider transition-colors ${isRead ? 'text-slate-500' : 'text-slate-800'}`}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                              
                              {/* Read/Unread Toggle Button */}
                              <div className="flex gap-2">
                                 <span className={`text-[10px] font-mono shrink-0 mr-1 mt-1 ${isRead ? 'text-slate-400' : 'text-blue-500'}`}>
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                                 <button 
                                   onClick={(e) => toggleReadStatus(e, log.id)} 
                                   className={`text-[10px] font-bold px-2 py-1 rounded transition-colors flex items-center opacity-0 group-hover:opacity-100 ${isRead ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-blue-600 bg-white/50 hover:bg-white border border-blue-100'}`}
                                 >
                                   {isRead ? <><MailOpen className="w-3 h-3 mr-1"/> Unread</> : <><Check className="w-3 h-3 mr-1"/> Mark Read</>}
                                 </button>
                              </div>
                            </div>
                            <p className={`text-xs leading-relaxed transition-colors ${isRead ? 'text-slate-500 line-clamp-2' : 'text-slate-700'}`}>
                              {log.remarks}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingUsers.length === 0 && liveAuditLogs.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">You're all caught up</p>
                  <p className="text-xs mt-1">No new activity to review.</p>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center shrink-0">
              <button 
                onClick={() => { setShowNotifications(false); navigate('/hr/audit'); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                View All Audit History &rarr;
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}