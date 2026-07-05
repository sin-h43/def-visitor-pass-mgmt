import { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface PendingRequest {
  id: string;
  full_name: string;
  email: string;
  department: string;
  auth_id: string;
  phone?: string;
}

interface RecentActivity {
  id: string;
  action: string;
  remarks: string;
  timestamp: string;
}

export default function HRNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    try {
      // ✅ FIX: Use .ilike() instead of .eq() to prevent case-sensitivity bugs!
      const { data: requests, error: reqError } = await supabase
        .from('employee_registrations')
        .select('*')
        .ilike('status', 'pending') 
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      if (requests) setPendingRequests(requests);

      // Fetch Recent Audit Logs
      const { data: logs, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (logError) throw logError;
      if (logs) setRecentActivity(logs);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchData();
    // Silent polling every 30 seconds to keep sync
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (req: PendingRequest) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // 🔥 OPTIMISTIC UI: Instantly vanish the card from the screen!
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));

    try {
      const generatedEmpId = `EMP-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Create the employee
      const { error: empError } = await supabase.from('employees').insert([{
        employee_id: generatedEmpId,
        auth_id: req.auth_id,
        name: req.full_name,
        email: req.email,
        phone: req.phone || '',
        department: req.department,
        role: 'employee'
      }]);
      if (empError) throw empError;

      // 2. Mark as approved in DB
      const { error: regError } = await supabase.from('employee_registrations').update({ status: 'approved' }).eq('id', req.id);
      if (regError) throw regError;

      // 3. Log activity
      await supabase.from('audit_logs').insert([{
        action: 'account_approved',
        remarks: `HOD authorized portal access for ${req.full_name} (${req.department})`,
        performed_by: 'HR/HOD Admin',
        performed_by_role: 'hr'
      }]);

      // Refresh activity list silently
      fetchData();
    } catch (error) {
      console.error('Failed to approve:', error);
      // If it fails, we fetch data to bring the card back
      fetchData();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async (req: PendingRequest) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // 🔥 OPTIMISTIC UI: Instantly vanish the card
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));

    try {
      const { error: regError } = await supabase.from('employee_registrations').update({ status: 'rejected' }).eq('id', req.id);
      if (regError) throw regError;

      await supabase.from('audit_logs').insert([{
        action: 'account_rejected',
        remarks: `HR declined portal access request for ${req.full_name}.`,
        performed_by: 'HR Admin',
        performed_by_role: 'hr'
      }]);

      fetchData();
    } catch (error) {
      console.error('Failed to decline:', error);
      fetchData();
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAction = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('reject') || lowerAction.includes('denied')) return { label: 'REJECTED', color: 'text-rose-600' };
    if (lowerAction.includes('approve')) return { label: 'ACCOUNT APPROVED', color: 'text-emerald-600' };
    if (lowerAction.includes('create') || lowerAction.includes('pending')) return { label: 'PENDING', color: 'text-amber-600' };
    return { label: action.replace(/_/g, ' ').toUpperCase(), color: 'text-slate-600' };
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {pendingRequests.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white border-2 border-white shadow-sm">
            {pendingRequests.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
            
            <div className="p-4 border-b border-slate-100 bg-white shadow-sm z-10">
              <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
            </div>

            <div className="overflow-y-auto bg-slate-50/50 flex-1 p-4 space-y-6 custom-scrollbar">
              
              {/* ACTION REQUIRED SECTION */}
              <div>
                <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2"></span>
                  Action Required ({pendingRequests.length})
                </h4>
                
                <div className="space-y-3">
                  {pendingRequests.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic">No pending requests.</p>
                  ) : (
                    pendingRequests.map(req => (
                      <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                        <h5 className="font-bold text-slate-900 text-sm">{req.full_name}</h5>
                        <p className="text-xs text-slate-500 mb-0.5">{req.email}</p>
                        <p className="text-xs text-slate-400 font-mono mb-3">Dept: {req.department}</p>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDecline(req)}
                            disabled={isProcessing}
                            className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                          </button>
                          <button 
                            onClick={() => handleApprove(req)}
                            disabled={isProcessing}
                            className="flex-1 py-2 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RECENT ACTIVITY SECTION */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Recent System Activity
                </h4>
                
                <div className="space-y-2">
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic">No recent activity.</p>
                  ) : (
                    recentActivity.map(log => {
                      const statusInfo = formatAction(log.action);
                      return (
                        <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[10px] font-bold uppercase ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium line-clamp-2">
                            {log.remarks}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
              <Link to="/hr/audit" onClick={() => setIsOpen(false)} className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                View Full Audit History →
              </Link>
            </div>

          </div>
        </>
      )}
    </div>
  );
}