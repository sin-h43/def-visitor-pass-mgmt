// pages/hr/index.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Building, FileText, Users, Clock, XCircle, ShieldCheck, UserPlus, History, Shield, Bell, Eye, CheckCircle, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { TableColumn, VisitorRecord } from '../../types/visitor';
import { supabase } from '../../lib/supabase';

const dynamicBroadcastPool = [
  { id: 1, type: 'FOREIGN REGISTRY', text: 'Passport clearance requested for Sarah Jenkins.', color: 'bg-orange-50 border-orange-100 text-orange-800' },
  { id: 2, type: 'GATE AUTO-SYNC', text: 'Gate 2 badge scanner synchronization completed.', color: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
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

  // CHANGE: Added new states to manage the always-editable text box (panelRemark) 
  // and the table popup modal (remarkModal).
  const [panelRemark, setPanelRemark] = useState('');
  const [remarkModal, setRemarkModal] = useState<{
    isOpen: boolean;
    visitId: string | null;
    action: 'Approved' | 'Denied' | null;
    text: string;
  }>({
    isOpen: false,
    visitId: null,
    action: null,
    text: '',
  });

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

  // CHANGE: Added a hook to auto-fill the drawer's text box with the existing comment 
  // from the database whenever an HR officer clicks on a visitor row.
  useEffect(() => {
    if (selectedVisitor) {
      setPanelRemark(selectedVisitor.hr_remarks || '');
    }
  }, [selectedVisitor]);

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
            created_at,
            hr_remarks,
            visitors (
              visitor_id,
              name,
              gender,
              phone,
              email,
              nationality,
              organization,
              designation,
              document_url,
              dob,
              id_type,
              id_number,
              address
            ),
            host:employees!visits_host_employee_id_fkey (
              name,
              role,
              employee_id
            ),
            department
          `);

        if (error) throw error;

        if (data) {
          const transformed: VisitorRecord[] = data.map((row: any) => {
            let uiPipeline: 'immediate' | 'scheduled' | 'repeated' = 'immediate';
            const dbType = row.visit_type?.toLowerCase();
            if (dbType === 'prescheduled' || dbType === 'scheduled') uiPipeline = 'scheduled';
            if (dbType === 'repeated') uiPipeline = 'repeated';

            const computedCategory = row.visitors?.nationality?.toLowerCase() !== 'indian' ? 'Foreign' : 'General';
            const escortsArray = Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []);

            return {
              id: row.visit_id,
              visitorName: row.visitors?.name || 'Unknown',
              gender: row.visitors?.gender || 'Others',
              phone: row.visitors?.phone || '',
              email: row.visitors?.email || '',
              category: computedCategory,
              purpose: row.purpose || '',
              hostName: row.host?.name || 'Unassigned',
              hostDept: row.host?.role === 'hr' ? 'HR Officer' : 'Staff Member',
              hostId: row.host?.id || '',
              requestedAt: row.created_at ? new Date(row.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A',
              visitDate: row.start_date ? new Date(row.start_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
              status: row.status || 'Pending',
              passType: row.pass_type || 'ONE_DAY',
              pipeline: uiPipeline,
              nationality: row.visitors?.nationality || 'Indian',
              organization: row.visitors?.organization || '',
              designation: row.visitors?.designation || 'N/A',
              documentUrl: row.visitors?.document_url || row.document_url || null,
              escorts: escortsArray,
              dob: row.visitors?.dob || 'N/A',
              id_type: row.visitors?.id_type || 'Govt ID',
              id_number: row.visitors?.id_number || 'N/A',
              address: row.visitors?.address || 'N/A',
              department: row.department || 'General Unit',
              hr_remarks: row.hr_remarks || ''
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

  // CHANGE: Master function that updates BOTH the visitor's status (Approved/Denied) 
  // AND pushes the newly typed HR remark to the Supabase database.
  const handleUpdateStatus = async (visitId: string | null, newStatus: 'Approved' | 'Denied' | null, remarkText: string) => {
    if (!visitId || !newStatus) return;
    try {
      const { error } = await supabase
        .from('visits')
        .update({ 
          status: newStatus,
          hr_remarks: remarkText 
        })
        .eq('visit_id', visitId);

      if (error) throw error;
      
      setDataList(prev => prev.map(log => log.id === visitId ? { ...log, status: newStatus, hr_remarks: remarkText } : log));
      if (selectedVisitor?.id === visitId) {
        setSelectedVisitor(prev => prev ? { ...prev, status: newStatus, hr_remarks: remarkText } : null);
      }
      
      // Close overlays
      setRemarkModal({ isOpen: false, visitId: null, action: null, text: '' });
      setIsDrawerOpen(false);
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to process status change.");
    }
  };

  // CHANGE: Secondary function just for the "Save Note" button. This allows HR to 
  // edit and save comments without accidentally changing the approval status.
  const handleUpdateRemarkOnly = async (visitId: string, remarkText: string) => {
    try {
      const { error } = await supabase
        .from('visits')
        .update({ hr_remarks: remarkText })
        .eq('visit_id', visitId);

      if (error) throw error;
      
      setDataList(prev => prev.map(log => log.id === visitId ? { ...log, hr_remarks: remarkText } : log));
      if (selectedVisitor?.id === visitId) {
        setSelectedVisitor(prev => prev ? { ...prev, hr_remarks: remarkText } : null);
      }
      alert("Internal note updated successfully!");
    } catch (error) {
      console.error('Error updating remark:', error);
      alert("Failed to save note.");
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

  const handleOpenDrawer = (visitor: VisitorRecord) => {
    setSelectedVisitor(visitor);
    setIsDrawerOpen(true);
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
          HR:  'bg-purple-50 text-purple-500 border-purple-100',
          Govt:'bg-emerald-50 text-emerald-500 border-emerald-100', 
          Foreign: 'bg-amber-50 text-amber-500 border-amber-100',
          Service: 'bg-orange-50 text-orange-500 border-orange-100',
          General: 'bg-blue-50 text-blue-500 border-blue-100'
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
        if (row.status === 'Pending') return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded font-medium border border-amber-200">Pending</span>;
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
              {/* CHANGE: Trigger remark modal instead of instant update */}
              <button onClick={() => setRemarkModal({ isOpen: true, visitId: row.id, action: 'Approved', text: row.hr_remarks || '' })} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => setRemarkModal({ isOpen: true, visitId: row.id, action: 'Denied', text: row.hr_remarks || '' })} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Deny"><X className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={() => handleOpenDrawer(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Open Clearance Drawer"><Eye className="w-4 h-4" /></button>
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
        
        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Requests', value: dataList.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { title: 'Pending Clearance',  value: dataList.filter(d => d.status === 'Pending').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
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

        {/* Workspace Splitting Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
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

          <div className="lg:col-span-1 space-y-6">
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

      {/* REVIEW SLIDE-OUT DRAWER PORTAL */}
      {isDrawerOpen && selectedVisitor && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Clearance Review</h2>
                <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedVisitor.id}</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-amber-600" /> Audit & Request Tracking
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Requested By</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.hostName}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Request Date</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.requestedAt}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Scheduled Visit</span><span className="col-span-2 font-medium text-slate-900 text-blue-600">{selectedVisitor.visitDate}</span></div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-600" /> Visitor Identity
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Full Name</span><span className="col-span-2 font-bold text-slate-900">{selectedVisitor.visitorName}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Gender</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.gender}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Nationality</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.nationality}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Phone</span><span className="col-span-2 font-medium text-slate-900 font-mono">{selectedVisitor.phone}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Email</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.email}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">DOB</span><span className="col-span-2 font-medium text-slate-900 font-mono">{selectedVisitor.dob}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">ID Type</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.id_type}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">ID Number</span><span className="col-span-2 font-medium text-slate-900 font-mono tracking-wider">{selectedVisitor.id_number}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Organization</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.organization}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Designation</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.designation}</span></div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <Building className="w-4 h-4 mr-2 text-blue-600" /> Purpose of Visit
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Department</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.department}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Pipeline</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.pipeline}</span></div>
                  <div>
                    <span className="text-slate-500 block mb-1">Declared Purpose</span>
                    <div className="bg-white p-3 border border-slate-200 rounded-lg leading-relaxed shadow-sm text-slate-800 text-xs font-medium">
                      {selectedVisitor.purpose}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-blue-600" /> Accompanying Escorts
                </h3>
                {selectedVisitor.escorts && selectedVisitor.escorts.length > 0 ? (
                  <div className="space-y-3 mt-2">
                    {selectedVisitor.escorts.map((escort, idx) => (
                      <div key={idx} className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm text-sm">
                        <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500">Name</span><span className="col-span-2 font-medium text-slate-900">{escort.name}</span></div>
                        <div className="grid grid-cols-3 gap-1"><span className="text-slate-500">{escort.id_type || 'ID'}</span><span className="col-span-2 font-medium text-slate-900 font-mono">{escort.id_number}</span></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic">No additional personnel attached.</div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-blue-600" /> Attached Credentials
                </h3>
                {selectedVisitor.documentUrl ? (
                  <a href={selectedVisitor.documentUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col items-center justify-center text-center hover:bg-blue-100 transition-colors group cursor-pointer">
                    <FileText className="w-8 h-8 mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-blue-700 text-xs">Review Clearance Document</span>
                  </a>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xl flex flex-col items-center justify-center text-center text-slate-400">
                    <span className="text-xs font-medium">No files attached by sponsor.</span>
                  </div>
                )}
              </section>
            </div>

            {/* CHANGE: ALWAYS EDITABLE COMMENTARY BOX IN DRAWER FOOTER */}
            <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Internal HR Remarks
                </label>
                <button 
                  onClick={() => handleUpdateRemarkOnly(selectedVisitor.id, panelRemark)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition-colors"
                >
                  Save Note
                </button>
              </div>
              
              <textarea
                rows={2}
                value={panelRemark}
                onChange={(e) => setPanelRemark(e.target.value)}
                placeholder="Add context, acceptance reasoning, or decline criteria..."
                className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none mb-4"
              />

              {selectedVisitor.status === 'Pending' && (
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleUpdateStatus(selectedVisitor.id, 'Denied', panelRemark)}
                    className="flex-1 py-2.5 bg-red-50 text-red-700 font-bold text-xs rounded-xl hover:bg-red-100 border border-red-100 transition-colors"
                  >
                    Decline Access
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedVisitor.id, 'Approved', panelRemark)}
                    className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    Authorize Access
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* CHANGE: FOOD DELIVERY STYLE ACTION MODAL 
          This is the new popup that appears when clicking Accept/Decline directly from the table.
          It binds to the remarkModal state and conditionally styles itself based on the action. */}
      {remarkModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            
            <div className={`p-5 text-center ${remarkModal.action === 'Approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <h3 className={`text-lg font-bold ${remarkModal.action === 'Approved' ? 'text-emerald-800' : 'text-red-800'}`}>
                {remarkModal.action === 'Approved' ? 'Approve Visitor Clearance' : 'Decline Visitor Access'}
              </h3>
              <p className="text-xs mt-1 text-slate-500">Leave an optional note for audit logs.</p>
            </div>

            <div className="p-6">
              <textarea
                autoFocus
                rows={3}
                placeholder="e.g., 'ID verified, escort required' or 'Denied due to expired visa...'"
                value={remarkModal.text}
                onChange={(e) => setRemarkModal(prev => ({ ...prev, text: e.target.value }))}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-800 bg-slate-50 resize-none"
              />

              <div className="flex gap-3 mt-5">
                <button 
                  onClick={() => setRemarkModal({ isOpen: false, visitId: null, action: null, text: '' })}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleUpdateStatus(remarkModal.visitId, remarkModal.action, remarkModal.text)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                    remarkModal.action === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm {remarkModal.action}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </DashboardLayout>
  );
}