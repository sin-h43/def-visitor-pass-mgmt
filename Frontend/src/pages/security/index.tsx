// File: Frontend/src/pages/security/index.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { QueueItem } from '../../types/visitor';
import { Clock, CheckCircle, AlertCircle, Users, TrendingUp, ChevronRight } from 'lucide-react';

interface QueueItemWithDetails extends QueueItem {
  visitor_details?: any;
}

const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDesks] = useState<number[]>([1, 2]);
  const [stats, setStats] = useState({ total: 0, processing: 0, completed: 0 });

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000); 
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('visits')
        .select(`*, visitors (*), host:employees!visits_host_employee_id_fkey(name)`)
        .ilike('status', 'approved') 
        .order('start_date', { ascending: true });

      if (error) throw error;

      const queueItems: QueueItemWithDetails[] = (data || []).map((visitLog: any) => {
        let priority: 'high' | 'medium' | 'low' = 'low';
        
        const isForeign = visitLog.visitors?.nationality?.toLowerCase() !== 'indian';
        const visitorType = isForeign ? 'foreign' : 'general';
        
        if (isForeign || visitLog.department?.toLowerCase().includes('defence')) priority = 'high';
        else if (visitLog.visit_type === 'Service' || visitLog.visit_type === 'Repeated') priority = 'medium';

        // FIX: Extracting the clean date to prevent the UTC 5:30 AM shift
        const cleanDate = visitLog.start_date 
          ? new Date(visitLog.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
          : 'TBD';

        return {
          visitor_id: visitLog.visitor_id,
          visitor_name: visitLog.visitors?.name || 'Unknown',
          arrival_time: visitLog.created_at,
          expected_arrival: cleanDate, // Corrected Time Display
          priority,
          status: 'pending',
          visitor_details: {
            ...visitLog.visitors,
            purpose: visitLog.purpose,
            employee_name: visitLog.host?.name || 'Unassigned',
            visitor_type: visitorType
          },
        };
      });

      queueItems.sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (a.expected_arrival === 'TBD') return 1;
        if (b.expected_arrival === 'TBD') return -1;
        return a.expected_arrival.localeCompare(b.expected_arrival);
      });

      setQueue(queueItems);
      setStats({
        total: queueItems.length,
        processing: queueItems.filter((q) => q.status === 'processing').length,
        completed: queueItems.filter((q) => q.status === 'completed').length,
      });
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-600" size={20} />;
      case 'processing': return <Clock className="text-blue-600 animate-spin" size={20} />;
      default: return <AlertCircle className="text-orange-600" size={20} />;
    }
  };

  const filteredQueue = queue.filter(item =>
    item.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.visitor_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout role="security" userName="Gate Console">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        </div>
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
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expected</p><p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p></div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Users size={20} /></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Processing</p><p className="text-2xl font-black text-blue-600 mt-1">{stats.processing}</p></div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Clock size={20} /></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</p><p className="text-2xl font-black text-emerald-600 mt-1">{stats.completed}</p></div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle size={20} /></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Desks</p><p className="text-2xl font-black text-purple-600 mt-1">{activeDesks.length}/4</p></div>
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><TrendingUp size={20} /></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <SearchFilterBar value={searchTerm} onChange={setSearchTerm} selectedFilters={{}} onFilterToggle={() => {}} filterGroups={[]} placeholder="Scan or search Pass ID / Name..." />
        </div>

        <div className="space-y-4">
          {filteredQueue.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
              <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No approved visitors awaiting clearance at the gates.</p>
            </div>
          ) : (
            filteredQueue.map((item, index) => (
              <div key={item.visitor_id} className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
                <div className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    
                    <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-slate-900 text-white font-black text-lg shadow-inner">
                          {index + 1}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-slate-900">{item.visitor_name}</h3>
                          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{item.visitor_id}</span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-slate-600">
                          <div><span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Date</span> {item.expected_arrival}</div>
                          <div><span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Clearance</span> <span className="uppercase font-medium">{item.visitor_details?.visitor_type || 'General'}</span></div>
                          <div><span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Sponsor</span> {item.visitor_details?.employee_name}</div>
                          <div><span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Purpose</span> <span className="truncate max-w-[150px] inline-block align-bottom font-medium">{item.visitor_details?.purpose}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(item.priority)}`}>
                        {item.priority} Priority
                      </span>

                      <button 
                        onClick={() => navigate(`/security/verify/${item.visitor_id}`)}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 font-bold shadow-sm shadow-blue-600/20 group-hover:scale-105"
                      >
                        Launch Verification <ChevronRight size={16} />
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}