// File: src/pages/security/index.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import { CheckCircle, AlertCircle, Users, TrendingUp, ChevronRight, AlertOctagon, ShieldAlert, X, User } from 'lucide-react';

interface QueueItemWithDetails {
  visitor_id: string;
  visit_id: string; 
  visitor_name: string;
  arrival_time: string;
  expected_arrival: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'Active'; 
  visitor_details?: any;
  checked_in_time?: string;
  expected_out?: string;
}

const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItemWithDetails[]>([]);
  const [activeCampus, setActiveCampus] = useState<QueueItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  const [activeDesks] = useState<number[]>([1, 2, 3]);

  // Emergency Modal State
  const [emergencyModal, setEmergencyModal] = useState<{isOpen: boolean, visitId: string, visitorId: string, name: string} | null>(null);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 30000); 
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => { clearInterval(interval); clearInterval(clockInterval); };
  }, []);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select(`*, visitors (*), host:employees!visits_host_employee_id_fkey(name)`)
        .in('status', ['Approved', 'Active']) 
        .order('start_date', { ascending: true });

      if (error) throw error;

      const formattedData: QueueItemWithDetails[] = (data || []).map((visitLog: any) => {
        let priority: 'high' | 'medium' | 'low' = 'low';
        const isForeign = visitLog.visitors?.nationality?.toLowerCase() !== 'indian';
        const visitorType = isForeign ? 'foreign' : 'general';
        
        if (isForeign || visitLog.department?.toLowerCase().includes('defence')) priority = 'high';
        else if (visitLog.visit_type === 'Service' || visitLog.visit_type === 'Repeated') priority = 'medium';

        return {
          visitor_id: visitLog.visitor_id,
          visit_id: visitLog.visit_id,
          visitor_name: visitLog.visitors?.name || 'Unknown',
          arrival_time: visitLog.created_at,
          expected_arrival: visitLog.start_date ? new Date(visitLog.start_date).toLocaleDateString('en-GB') : 'TBD',
          priority,
          status: visitLog.status.toLowerCase() === 'active' ? 'Active' : 'pending',
          checked_in_time: visitLog.visitors?.checked_in_time,
          expected_out: visitLog.expected_out,
          visitor_details: {
            ...visitLog.visitors,
            purpose: visitLog.purpose,
            employee_name: visitLog.host?.name || 'Unassigned',
            visitor_type: visitorType
          },
        };
      });

      setQueue(formattedData.filter(q => q.status === 'pending').sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]));
      setActiveCampus(formattedData.filter(q => q.status === 'Active'));

    } catch (error) {
      console.error('Error fetching queues:', error);
    } finally {
      setLoading(false);
    }
  };

const handleNormalCheckout = async (visitId: string, visitorId: string, expectedOut: string | undefined) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // FIX: Look up the actual employee ID from the database using their auth email
      let empId = null;
      if (user?.email) {
        const { data: empData } = await supabase.from('employees').select('id').eq('email', user.email).single();
        empId = empData?.id;
      }
      
      const now = new Date();
      let isOverage = false;
      let excessMins = 0;

      if (expectedOut) {
        const expDate = new Date(expectedOut);
        if (now > expDate) {
          isOverage = true;
          excessMins = Math.floor((now.getTime() - expDate.getTime()) / 60000);
        }
      }

      const nowIso = now.toISOString();
      await supabase.from('visits').update({ status: 'Completed', actual_out: nowIso }).eq('visit_id', visitId);
      await supabase.from('visitors').update({ checked_out_time: nowIso }).eq('visitor_id', visitorId);

      if (isOverage) {
        let severity = 'Low';
        if (excessMins > 30) severity = 'Medium';
        if (excessMins > 120) severity = 'High';

        await supabase.from('forensic_incidents').insert([{
          visitor_id: visitorId,
          visit_id: visitId,
          incident_type: 'time_overage',
          severity,
          excess_minutes: excessMins,
          reason: `Auto-logged: Visitor exceeded authorized time by ${excessMins} minutes.`,
          reported_by: empId || 'System Automated',
          status: 'open'
        }]);
      }

      await supabase.from('audit_logs').insert([{
        visitor_id: visitorId,
        action: 'checked_out',
        performed_by_id: empId, // <--- NOW INSERTS THE CORRECT EMPLOYEE ID
        performed_by: user?.email || 'Security Desk',
        performed_by_role: 'security',
        remarks: isOverage ? `Checked out late (${excessMins}m overage)` : 'Normal Checkout'
      }]);

      fetchQueues();
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  const handleEmergencyCheckout = async () => {
    if (!emergencyModal || !emergencyReason) return;
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // FIX: Look up the actual employee ID
      let empId = null;
      if (user?.email) {
        const { data: empData } = await supabase.from('employees').select('id').eq('email', user.email).single();
        empId = empData?.id;
      }

      const now = new Date().toISOString();
      
      await supabase.from('visits').update({ status: 'Revoked', actual_out: now }).eq('visit_id', emergencyModal.visitId);
      await supabase.from('visitors').update({ checked_out_time: now }).eq('visitor_id', emergencyModal.visitorId);

      await supabase.from('forensic_incidents').insert([{
        visitor_id: emergencyModal.visitorId,
        visit_id: emergencyModal.visitId,
        incident_type: 'emergency_revocation',
        severity: 'Critical',
        reason: emergencyReason,
        reported_by: empId || 'Security Desk',
        status: 'open'
      }]);

      await supabase.from('audit_logs').insert([{
        visitor_id: emergencyModal.visitorId,
        action: 'emergency_removal',
        performed_by_id: empId, // <--- NOW INSERTS THE CORRECT EMPLOYEE ID
        performed_by: user?.email || 'Security Desk',
        performed_by_role: 'security',
        severity: 'Critical',
        remarks: `EMERGENCY REMOVAL: ${emergencyReason}`
      }]);

      setEmergencyModal(null);
      setEmergencyReason('');
      fetchQueues();
      alert('Emergency protocol executed. HR has been notified.');
    } catch (error) {
      alert('Failed to process emergency checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateOverage = (expectedOut?: string) => {
    if (!expectedOut) return { exceeded: false, minutes: 0 };
    const exp = new Date(expectedOut);
    if (currentTime > exp) {
      return { exceeded: true, minutes: Math.floor((currentTime.getTime() - exp.getTime()) / 60000) };
    }
    return { exceeded: false, minutes: 0 };
  };

  const filteredQueue = queue.filter(item => item.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredActive = activeCampus.filter(item => item.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="security" userName="Gate Console">
        <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-900"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="security" userName="Gate Console">
      <div className="max-w-7xl mx-auto space-y-4">
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-900 text-white rounded-lg shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Security Terminal</h1>
            <p className="text-sm text-slate-500">Real-time visitor queue and active clearance pipeline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Gate Clearance</p><p className="text-2xl font-bold font-black text-slate-800 mt-1">{queue.length}</p></div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Users size={20} /></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active on Campus</p><p className="text-2xl font-black font-bold text-emerald-600 mt-1">{activeCampus.length}</p></div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><ShieldAlert size={20} /></div>
          </div>
          {/* <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forensic Alerts</p><p className="text-2xl font-black text-rose-600 mt-1">Auto</p></div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600"><AlertOctagon size={20} /></div>
          </div> */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Desks</p><p className="text-2xl font-black font-bold text-purple-600 mt-1">{activeDesks.length}/4</p></div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><TrendingUp size={20} /></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2">
          
          <SearchFilterBar value={searchTerm} onChange={setSearchTerm} selectedFilters={{}} onFilterToggle={() => {}} filterGroups={[]} placeholder="Search Name or Pass ID..." />

          {/* HR-Style Minimalist Tabs */}
          <div className="flex border-b border-slate-200 text-sm font-semibold space-x-4 mt-2">
            <button onClick={() => setActiveTab('pending')} className={`pb-3 px-1 relative ${activeTab === 'pending' ? 'text-blue-600  border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              Pending Queue <span className="ml-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{queue.length}</span>
            </button>
            <button onClick={() => setActiveTab('active')} className={`pb-3 px-1 relative ${activeTab === 'active' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
              Active Passes <span className="ml-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{activeCampus.length}</span>
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {activeTab === 'pending' ? (
              filteredQueue.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium text-sm">No pending approvals at the gate.</p>
                </div>
              ) : (
                filteredQueue.map((item) => (
                  <div key={item.visitor_id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md transition-all gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200 shrink-0">
                        <User className="text-slate-400 w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 text-base">{item.visitor_name}</h3>
                          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-100">{item.visitor_id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${getPriorityColor(item.priority)}`}>{item.priority} Priority</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                          <div><span className="text-slate-400 font-medium">Clearance:</span> <span className="text-slate-700 font-medium uppercase">{item.visitor_details?.visitor_type || 'General'}</span></div>
                          <div><span className="text-slate-400 font-medium">Sponsor:</span> <span className="text-slate-700 font-medium">{item.visitor_details?.employee_name}</span></div>
                          <div><span className="text-slate-400 font-medium">Date:</span> <span className="text-slate-700 font-medium">{item.expected_arrival}</span></div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/security/verify/${item.visitor_id}`)} className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0">
                      Verify & Grant Access <ChevronRight size={16} />
                    </button>
                  </div>
                ))
              )
            ) : (
              filteredActive.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center">
                  <ShieldAlert className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium text-sm">Campus is currently clear of visitors.</p>
                </div>
              ) : (
                filteredActive.map((item) => {
                  const overage = calculateOverage(item.expected_out);
                  const isWarning = overage.exceeded;
                  
                  return (
                    <div key={item.visitor_id} className={`bg-white rounded-xl border p-5 shadow-sm transition-all flex flex-col gap-4 ${isWarning ? 'border-red-300 bg-red-50/10' : 'border-slate-200 hover:border-emerald-300'}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border shrink-0 ${isWarning ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                            {isWarning ? <AlertOctagon className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-900 text-base">{item.visitor_name}</h3>
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold border border-slate-200">{item.visitor_id}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                              <div><span className="text-slate-400 font-medium">In:</span> <span className="font-bold text-slate-700">{item.checked_in_time ? new Date(item.checked_in_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</span></div>
                              <div><span className="text-slate-400 font-medium">Target Out:</span> <span className="font-bold text-slate-700">{item.expected_out ? new Date(item.expected_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '18:00'}</span></div>
                              <div><span className="text-slate-400 font-medium">Host:</span> <span className="font-medium text-slate-700">{item.visitor_details?.employee_name}</span></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                          <button onClick={() => setEmergencyModal({isOpen: true, visitId: item.visit_id!, visitorId: item.visitor_id, name: item.visitor_name})} className="flex-1 md:flex-none px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5">
                            <AlertOctagon size={14}/> Remove
                          </button>
                          <button onClick={() => handleNormalCheckout(item.visit_id!, item.visitor_id, item.expected_out)} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors">
                            Checkout
                          </button>
                        </div>
                      </div>

                      {/* Clean Overage Alert Banner inside the card instead of full-border pulsing */}
                      {isWarning && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2 text-red-700 text-xs font-bold">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>Forensic Alert: Visitor has exceeded authorized time by {overage.minutes} minutes. Auto-logged to registry.</span>
                        </div>
                      )}

                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      </div>

      {/* Emergency Checkout Modal */}
      {emergencyModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
            <div className="p-5 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-red-800 flex items-center"><AlertOctagon className="w-5 h-5 mr-2"/> CRITICAL: Emergency Removal</h3>
                <p className="text-xs text-red-600 mt-0.5">{emergencyModal.name} ({emergencyModal.visitorId})</p>
              </div>
              <button onClick={() => setEmergencyModal(null)} className="text-red-400 hover:text-red-700"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm font-medium text-slate-600">This action immediately revokes access, creates a CRITICAL forensic log, and alerts HR. This cannot be undone.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Removal (Required)</label>
                <textarea autoFocus value={emergencyReason} onChange={e => setEmergencyReason(e.target.value)} rows={3} placeholder="Describe aggressive behavior, security breach, etc..." className="w-full border border-red-200 rounded-lg p-3 text-sm focus:outline-none focus:border-red-400 bg-red-50/50 resize-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEmergencyModal(null)} className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 border border-slate-200">Cancel</button>
                <button onClick={handleEmergencyCheckout} disabled={!emergencyReason || isProcessing} className="flex-1 py-2.5 font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50">
                  {isProcessing ? 'Revoking...' : 'Confirm Removal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}