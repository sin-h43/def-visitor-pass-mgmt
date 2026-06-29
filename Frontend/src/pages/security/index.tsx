// File: src/pages/security/index.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import { Clock, CheckCircle, AlertCircle, Users, TrendingUp, ChevronRight, AlertOctagon, ShieldAlert, X } from 'lucide-react';

interface QueueItemWithDetails {
  visitor_id: string;
  visit_id: string; // Guaranteed to exist now
  visitor_name: string;
  arrival_time: string;
  expected_arrival: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'Active'; // Safely includes Active
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
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 60000); // Update clock every min for overage calculation
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

  const handleEmergencyCheckout = async () => {
    if (!emergencyModal || !emergencyReason) return;
    setIsProcessing(true);
    
    try {
      const now = new Date().toISOString();
      
      // 1. Update Visit Status
      await supabase.from('visits').update({ status: 'Revoked', actual_out: now }).eq('visit_id', emergencyModal.visitId);
      
      // 2. Update Visitor Check-out
      await supabase.from('visitors').update({ checked_out_time: now }).eq('visitor_id', emergencyModal.visitorId);

      // 3. Log to Forensic Incidents
      await supabase.from('forensic_incidents').insert([{
        visitor_id: emergencyModal.visitorId,
        visit_id: emergencyModal.visitId,
        incident_type: 'emergency_revocation',
        severity: 'Critical',
        reason: emergencyReason,
        reported_by: 'Security Desk',
        status: 'open'
      }]);

      // 4. Update Audit Log
      await supabase.from('audit_logs').insert([{
        visitor_id: emergencyModal.visitorId,
        action: 'emergency_removal',
        performed_by: 'Security Desk',
        performed_by_role: 'security',
        severity: 'Critical',
        remarks: `EMERGENCY REMOVAL: ${emergencyReason}`
      }]);

      setEmergencyModal(null);
      setEmergencyReason('');
      fetchQueues();
      alert('Emergency protocol executed. HR has been notified.');
    } catch (error) {
      console.error('Emergency checkout failed:', error);
      alert('Failed to process emergency checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNormalCheckout = async (visitId: string, visitorId: string, expectedOut: string | undefined) => {
    try {
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
          reported_by: 'System Automated',
          status: 'open'
        }]);
      }

      await supabase.from('audit_logs').insert([{
        visitor_id: visitorId,
        action: 'checked_out',
        performed_by: 'Security Desk',
        performed_by_role: 'security',
        remarks: isOverage ? `Checked out late (${excessMins}m overage)` : 'Normal Checkout'
      }]);

      fetchQueues();
    } catch (error) {
      console.error('Checkout failed:', error);
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

  if (loading) {
    return (
      <DashboardLayout role="security" userName="Gate Console">
        <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-900"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="security" userName="Gate Console">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Terminal</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time visitor queue and active clearance pipeline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Clearance</p><p className="text-2xl font-black text-slate-800 mt-1">{queue.length}</p></div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Users size={20} /></div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active on Campus</p><p className="text-2xl font-black text-emerald-600 mt-1">{activeCampus.length}</p></div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><ShieldAlert size={20} /></div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forensic Alerts</p><p className="text-2xl font-black text-rose-600 mt-1">Auto</p></div>
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600"><AlertOctagon size={20} /></div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Desks</p><p className="text-2xl font-black text-purple-600 mt-1">{activeDesks.length}/4</p></div>
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><TrendingUp size={20} /></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
            <button onClick={() => setActiveTab('pending')} className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'pending' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
              Pending Queue ({queue.length})
            </button>
            <button onClick={() => setActiveTab('active')} className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
              Active on Campus ({activeCampus.length})
            </button>
          </div>
          <div className="w-full sm:w-96">
            <SearchFilterBar value={searchTerm} onChange={setSearchTerm} selectedFilters={{}} onFilterToggle={() => {}} filterGroups={[]} placeholder="Search Name or ID..." />
          </div>
        </div>

        <div className="space-y-3">
          {activeTab === 'pending' ? (
            filteredQueue.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm"><Clock className="mx-auto h-12 w-12 text-slate-300 mb-4" /><p className="text-slate-500 font-medium">No pending approvals at the gate.</p></div>
            ) : (
              filteredQueue.map((item) => (
                <div key={item.visitor_id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 border border-slate-200">{item.visitor_details?.visitor_type === 'foreign' ? 'F' : 'G'}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{item.visitor_name}</h3>
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{item.visitor_id}</span>
                        {item.priority === 'high' && <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase">High Priority</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Host: <span className="font-medium text-slate-700">{item.visitor_details?.employee_name}</span> | Date: {item.expected_arrival}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/security/verify/${item.visitor_id}`)} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 flex items-center gap-2 shadow-sm">
                    Verify <ChevronRight size={16} />
                  </button>
                </div>
              ))
            )
          ) : (
            filteredActive.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm"><CheckCircle className="mx-auto h-12 w-12 text-emerald-300 mb-4" /><p className="text-slate-500 font-medium">Campus is currently clear.</p></div>
            ) : (
              filteredActive.map((item) => {
                const overage = calculateOverage(item.expected_out);
                const isWarning = overage.exceeded;
                
                return (
                  <div key={item.visitor_id} className={`bg-white rounded-lg border-2 p-4 flex items-center justify-between shadow-sm transition-all ${isWarning ? 'border-rose-500 shadow-rose-100/50 pulse-border' : 'border-emerald-500'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner ${isWarning ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                        {isWarning ? <AlertOctagon size={18} /> : <ShieldAlert size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">{item.visitor_name}</h3>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.visitor_id}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className="text-slate-500">In: <span className="font-bold text-slate-700">{item.checked_in_time ? new Date(item.checked_in_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</span></span>
                          <span className="text-slate-500">Out: <span className="font-bold text-slate-700">{item.expected_out ? new Date(item.expected_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '18:00'}</span></span>
                          {isWarning && <span className="font-bold text-rose-600 flex items-center"><AlertCircle size={12} className="mr-1"/> Exceeded by {overage.minutes}m</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleNormalCheckout(item.visit_id!, item.visitor_id, item.expected_out)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 border border-slate-200">
                        Checkout
                      </button>
                      <button onClick={() => setEmergencyModal({isOpen: true, visitId: item.visit_id!, visitorId: item.visitor_id, name: item.visitor_name})} className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 shadow-sm flex items-center gap-2">
                        Emergency Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Emergency Checkout Modal */}
      {emergencyModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-rose-800 flex items-center"><AlertOctagon className="w-5 h-5 mr-2"/> CRITICAL: Emergency Removal</h3>
                <p className="text-xs text-rose-600 mt-0.5">{emergencyModal.name} ({emergencyModal.visitorId})</p>
              </div>
              <button onClick={() => setEmergencyModal(null)} className="text-rose-400 hover:text-rose-700"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm font-medium text-slate-600">This action immediately revokes access, creates a CRITICAL forensic log, and alerts HR. This cannot be undone.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Removal (Required)</label>
                <textarea autoFocus value={emergencyReason} onChange={e => setEmergencyReason(e.target.value)} rows={3} placeholder="Describe aggressive behavior, security breach, etc..." className="w-full border-2 border-rose-200 rounded-lg p-3 text-sm focus:outline-none focus:border-rose-500 bg-rose-50/30 resize-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEmergencyModal(null)} className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button onClick={handleEmergencyCheckout} disabled={!emergencyReason || isProcessing} className="flex-1 py-2.5 font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-md disabled:opacity-50">
                  {isProcessing ? 'Revoking...' : 'Confirm Removal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-border { 0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); } }
        .pulse-border { animation: pulse-border 2s infinite; }
      `}}/>
    </DashboardLayout>
  );
}