// pages/hr/index.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, XCircle, ShieldCheck, UserPlus, History, Shield, Bell, Eye, CheckCircle, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { VisitorRecord, TableColumn } from '../../types/visitor';
import { supabase } from '../../lib/supabase';

const dynamicBroadcastPool = [
  { id: 1, type: 'FOREIGN REGISTRY', text: 'Passport clearance requested for Sarah Jenkins.', color: 'bg-orange-50 border-orange-100 text-orange-800' },
  { id: 2, type: 'GATE AUTO-SYNC', text: 'Gate 2 badge scanner synchronization completed.', color: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
  { id: 3, type: 'GOVT CLEARANCE', text: 'Pass DEF-8821 authorized by cyber security command desk.', color: 'bg-purple-50 border-purple-100 text-purple-800' },
  { id: 4, type: 'VITAL ALERTS', text: 'Contractor Madan Gowda logged departure via South Outpost.', color: 'bg-slate-50 border-slate-200 text-slate-700' },
  { id: 5, type: 'SYSTEM AUDIT', text: 'Centralized pass pipeline rules updated.', color: 'bg-blue-50 border-blue-100 text-blue-800' }
];

export default function HRDashboard() {
  const [dataList, setDataList] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [broadcastLogs, setBroadcastLogs] = useState([dynamicBroadcastPool[0], dynamicBroadcastPool[1]]);

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    category: ['Govt', 'Foreign', 'Service', 'General', 'HR'],
    pipeline: ['immediate', 'scheduled', 'repeated'],
    status: ['Pending', 'Approved', 'Denied', 'Cleared', 'Active']
  });

  const hrFilterGroups = [
    {
      key: 'category',
      title: 'Category Tracks',
      options: [
        { label: 'Government / Defence', value: 'Govt' },
        { label: 'Foreign Nationals', value: 'Foreign' },
        { label: 'Service / Vendors', value: 'Service' },
        { label: 'General Walk-ins', value: 'General' }
      ]
    },
    {
      key: 'pipeline',
      title: 'Pipeline Types',
      options: [
        { label: 'Immediate Access', value: 'immediate' },
        { label: 'Pre-Scheduled Entry', value: 'scheduled' },
        { label: 'Repeated Framework', value: 'repeated' }
      ]
    },
    {
      key: 'status',
      title: 'Pass Clearance Status',
      options: [
        { label: 'Pending Review', value: 'Pending' },
        { label: 'Approved Access', value: 'Approved' },
        { label: 'Active On-Site', value: 'Active' },
        { label: 'Cleared Outposts', value: 'Cleared' }
      ]
    }
  ];

  // 1. Live Supabase Data Fetch
  useEffect(() => {
    async function fetchVisits() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('visits')
          .select(`
            visit_id,
            visit_type,
            pass_type,
            purpose,
            status,
            start_date,
            visitors (
              visitor_id,
              name,
              phone,
              email,
              nationality,
              organization
            ),
            host:employees!visits_host_employee_id_fkey (
              name,
              role,
              id
            )
          `);

        if (error) throw error;

        if (data) {
          const transformed: VisitorRecord[] = data.map((row: any) => {
            let uiPipeline: 'immediate' | 'scheduled' | 'repeated' = 'immediate';
            const dbType = row.visit_type?.toLowerCase();
            if (dbType === 'prescheduled' || dbType === 'scheduled') uiPipeline = 'scheduled';
            if (dbType === 'repeated') uiPipeline = 'repeated';

            const computedCategory = row.visitors?.nationality?.toLowerCase() !== 'indian' ? 'Foreign' : 'General';

            return {
              id: row.visit_id,
              visitorName: row.visitors?.name || 'Unknown',
              phone: row.visitors?.phone || '',
              email: row.visitors?.email,
              category: computedCategory,
              purpose: row.purpose || '',
              hostName: row.host?.name || 'Unassigned',
              hostDept: row.host?.role === 'hr' ? 'HR Officer' : 'Staff Member',
              requestDate: row.start_date ? new Date(row.start_date).toLocaleDateString('en-IN') : 'N/A',
              status: row.status as 'Pending' | 'Approved' | 'Denied' | 'Cleared' | 'Active',
              passType: row.pass_type || 'ONE_DAY',
              pipeline: uiPipeline,
              nationality: row.visitors?.nationality || 'Indian',
              organization: row.visitors?.organization || ''
            };
          });
          setDataList(transformed);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVisits();
  }, []);

  // Broadcast animation
  useEffect(() => {
    const interval = setInterval(() => {
      const randomLog = dynamicBroadcastPool[Math.floor(Math.random() * dynamicBroadcastPool.length)];
      setBroadcastLogs(prev => [{ ...randomLog, id: Date.now() }, ...prev.slice(0, 3)]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // 2. Real Database Update for Status Action Buttons
  const handleUpdateStatus = async (id: string, newStatus: VisitorRecord['status']) => {
    // Instantly update the UI so it feels fast
    setDataList(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    
    // Update the record in Supabase in the background
    const { error } = await supabase
      .from('visits')
      .update({ status: newStatus })
      .eq('visit_id', id);
      
    if (error) {
      console.error("Failed to update status in DB:", error);
      alert("Failed to update pass status. Please try again.");
    }
  };

  const handleFilterToggle = (groupKey: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[groupKey] || [];
      const updated = current.includes(value) 
        ? current.filter(item => item !== value) 
        : [...current, value];
      return { ...prev, [groupKey]: updated };
    });
  };

  const matrixFilteredRows = dataList.filter(row => {
    const matchesSearch = 
      row.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = (selectedFilters.category || []).includes(row.category);
    const matchesPipeline = (selectedFilters.pipeline || []).includes(row.pipeline);
    const matchesStatus = (selectedFilters.status || []).includes(row.status);

    let matchesTab = true;
    if (activeTab === 'Pending Verification') matchesTab = row.status === 'Pending';
    if (activeTab === 'Active Passes') matchesTab = row.status === 'Approved' || row.status === 'Active';

    return matchesSearch && matchesCategory && matchesPipeline && matchesStatus && matchesTab;
  });

  const columns: TableColumn<VisitorRecord>[] = [
    { key: 'id', label: 'PASS ID', render: (row) => <span className="text-blue-600 font-mono font-bold text-xs">{row.id}</span> },
    {
      key: 'visitorName',
      label: 'VISITOR DETAILS',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{row.visitorName}</div>
          <div className="text-xs text-slate-500 font-mono">{row.phone}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY',
      render: (row) => {
        const colors: Record<string, string> = {
          Govt: 'bg-purple-100 text-purple-800 border-purple-200',
          Foreign: 'bg-orange-100 text-orange-800 border-orange-200',
          Service: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          General: 'bg-slate-100 text-slate-800 border-slate-200'
        };
        return <span className={`px-2 py-0.5 text-xs font-bold rounded border ${colors[row.category] || 'bg-slate-100'}`}>{row.category}</span>;
      }
    },
    { key: 'pipeline', label: 'PIPELINE TYPE', render: (row) => <span className="text-xs uppercase font-semibold text-slate-500 font-mono tracking-wider">{row.pipeline}</span> },
    { key: 'purpose', label: 'PURPOSE OBJECTIVE', render: (row) => <p className="text-xs text-slate-600 max-w-[140px] truncate" title={row.purpose}>{row.purpose}</p> },
    { key: 'hostName', label: 'ASSIGNED HOST', render: (row) => <span className="text-slate-700 font-medium text-xs">{row.hostName}</span> },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => {
        if (row.status === 'Approved' || row.status === 'Active') return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded font-medium border border-emerald-200">Active</span>;
        if (row.status === 'Pending') return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded font-medium border border-amber-200">HR Review</span>;
        if (row.status === 'Denied') return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs rounded font-medium border border-rose-200">Denied</span>;
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{row.status}</span>;
      }
    },
    {
      key: 'id',
      label: 'ACTIONS',
      render: (row) => (
        <div className="flex items-center space-x-1">
          {row.status === 'Pending' && (
            <>
              <button onClick={() => handleUpdateStatus(row.id, 'Approved')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => handleUpdateStatus(row.id, 'Denied')} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Deny"><X className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={() => alert(`Reviewing credentials payload for: ${row.id}`)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><Eye className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <DashboardLayout role="hr" userName="Sinchana K">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-full mb-4"></div>
            <p className="text-slate-500 font-medium">Loading command center...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 3. Fully Dynamic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Requests', value: dataList.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { title: 'Pending Clearance', value: dataList.filter(d => d.status === 'Pending').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { title: 'Denied Access', value: dataList.filter(d => d.status === 'Denied').length.toString(), icon: XCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
            { title: 'Active On-Site', value: dataList.filter(d => d.status === 'Approved' || d.status === 'Active').length.toString(), icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-5 border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} border ${stat.border}`}><stat.icon className="w-5 h-5" /></div>
            </div>
          ))}
        </div>

        {/* 60/40 Split Content Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Centralized Access Management Queue</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time gate passes and processing pipelines control panel</p>
            </div>

            <div>
              <SearchFilterBar 
                value={searchTerm}
                onChange={setSearchTerm}
                selectedFilters={selectedFilters}
                onFilterToggle={handleFilterToggle}
                filterGroups={hrFilterGroups}
                placeholder="Search by name or Pass ID..."
              />
            </div>

            <div className="flex border-b border-slate-200 text-xs font-semibold space-x-4">
              {['All Requests', 'Pending Verification', 'Active Passes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 px-1 relative ${activeTab === tab ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <DataTable 
                data={matrixFilteredRows} 
                columns={columns}
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base mb-4">Command Quick Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <Link to="/hr/visitormgmt" className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-slate-50/50 transition-all group">
                  <div className="flex items-center text-sm font-medium text-slate-700">
                    <UserPlus className="w-4 h-4 mr-3 text-slate-400 group-hover:text-blue-500" />
                    Launch Visitor Onboarding
                  </div>
                  <span className="text-xs text-slate-400">Go →</span>
                </Link>
                <Link to="/hr/visitormgmt" className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-amber-500 hover:bg-slate-50/50 transition-all group">
                  <div className="flex items-center text-sm font-medium text-slate-700">
                    <History className="w-4 h-4 mr-3 text-slate-400 group-hover:text-amber-500" />
                    Review Repeated Manifests
                  </div>
                  <span className="text-xs text-slate-400">View →</span>
                </Link>
                <div onClick={() => alert('Synchronizing console parameters...')} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-purple-500 hover:bg-slate-50/50 transition-all cursor-pointer group">
                  <div className="flex items-center text-sm font-medium text-slate-700">
                    <Shield className="w-4 h-4 mr-3 text-slate-400 group-hover:text-purple-500" />
                    Gate Security Sync Console
                  </div>
                  <span className="text-xs text-slate-400">Link 🟢</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[320px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center">
                  <Bell className="w-4 h-4 mr-2 text-slate-500" />
                  Live Activity Broadcast
                </h3>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {broadcastLogs.map((log) => (
                  <div key={log.id} className={`p-3 border rounded-lg transition-all duration-300 ${log.color}`}>
                    <div className="flex justify-between font-bold text-[10px] uppercase tracking-wider mb-1">
                      <span>{log.type}</span>
                      <span className="font-mono text-slate-400">LIVE</span>
                    </div>
                    <p className="font-medium">{log.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}