import { useState, useEffect } from 'react';
import { Link  } from 'react-router-dom';
import { User, Building, Bell, FileText, Users, Clock, XCircle, ShieldCheck, UserPlus, History, Shield, Eye, CheckCircle, X, AlertOctagon } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { TableColumn, VisitorRecord } from '../../types/visitor';
import { supabase } from '../../lib/supabase';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';
import HRNotificationCenter from './HRNotificationCenter';

export interface ExtendedVisitorRecord extends VisitorRecord {
  visitorId: string; 
  requestedAt: string;
  visitDate: string;
  passType: string;
  checkoutTime?: string;
  approvedAt?: string;
  // expectedOut?: string;
  daysLeft?: string;
  endDate?:string;
}

export default function HRDashboard() {
  const [dataList, setDataList] = useState<ExtendedVisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Requests');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [liveAuditLogs, setLiveAuditLogs] = useState<any[]>([]);

  const [panelRemark, setPanelRemark] = useState('');
  const [remarkModal, setRemarkModal] = useState<{ isOpen: boolean; visitId: string | null; action: 'Approved' | 'Denied' | null; text: string; }>({
    isOpen: false, visitId: null, action: null, text: '',
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<ExtendedVisitorRecord | null>(null);

  const [emergencyModal, setEmergencyModal] = useState<{isOpen: boolean, visitId: string, visitorId: string, name: string} | null>(null);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    category: ['Govt', 'Foreign', 'Service', 'General', 'HOD'],
    pipeline: ['immediate', 'scheduled', 'repeated'],
    status: ['Pending', 'Approved', 'Denied', 'Cleared', 'Active']
  });
  
  const [currentUser, setCurrentUser] = useState({ userName: 'Loading...', avatarUrl: '', empId: '' });

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUser({ userName: emp.name, avatarUrl: emp.avatar_url || '', empId: emp.employee_id });
        } catch(e) {
          setCurrentUser({ userName: 'HOD Admin', avatarUrl: '', empId: 'HOD-000' });
        }
      }
    };
    loadUserProfile();
  }, []);

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

  async function fetchVisits(isInitialLoad = false) {
    try {
      if (isInitialLoad) setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        // ✅ FIX: Explicitly request approved_at and actual_out
        .select(`
          visit_id, visit_type, pass_type, purpose, status, start_date, end_date, created_at, hr_remarks, approved_at, actual_out,category,
          visitors (visitor_id, name, gender, phone, email, nationality, organization, designation, document_url, dob, id_type, id_number, address),
          host:employees!visits_host_employee_id_fkey (name, role, employee_id), department
        `);

      if (error) throw error;

      if (data) {
        const transformed: ExtendedVisitorRecord[] = data.map((row: any) => {
          let uiPipeline: 'immediate' | 'scheduled' | 'repeated' = 'immediate';
          const dbType = row.visit_type?.toLowerCase();
          if (dbType === 'prescheduled' || dbType === 'scheduled') uiPipeline = 'scheduled';
          if (dbType === 'repeated') uiPipeline = 'repeated';

          let computedCategory = 'General';
          if (row.category) {
            const type = row.category.toLowerCase();
            if (type.includes('govt')) computedCategory = 'Govt';
            else if (type.includes('hod')) computedCategory = 'HOD';
            else if (type.includes('service')) computedCategory = 'Service';
            else if (type.includes('foreign')) computedCategory = 'Foreign';
          } else if (row.visitors?.nationality?.toLowerCase() !== 'indian') {
            computedCategory = 'Foreign';
          }
          const escortsArray = Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []);
          const endD = row.end_date ? new Date(row.end_date) : null;
          let dLeft = 'N/A';
          if (endD) {
            const dTime = endD.getTime() - new Date().getTime();
            const dRaw = dTime / (1000 * 60 * 60 * 24);
            if (dRaw < 0) dLeft = 'Expired';
            else if (dRaw < 1) dLeft = 'Expires Today';
            else dLeft = `${Math.ceil(dRaw)} Days Left`;
          }
          return {
            id: row.visit_id || '',
            visitorId: row.visitors?.visitor_id || 'N/A', 
            visitorName: row.visitors?.name || 'Unknown',
            gender: row.visitors?.gender || 'Others',
            phone: row.visitors?.phone || '',
            email: row.visitors?.email || '',
            category: computedCategory,
            purpose: row.purpose || '',
            hostName: row.host?.name || 'Unassigned',
            hostDept: row.host?.role === 'hr' ? 'HOD Officer' : 'Staff Member',
            hostId: row.host?.employee_id || '',
            requestedAt: row.created_at ? new Date(row.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A',
            visitDate: row.start_date ? new Date(row.start_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
            
            // ✅ FIX: Map exactly to approved_at
            approvedAt: row.approved_at ? new Date(row.approved_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A',
            checkoutTime: row.actual_out ? new Date(row.actual_out).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A',
            // expectedOut: endD ? endD.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A',
            endDate: row.end_date || '--',
            daysLeft: dLeft,            
            status: row.status || 'Pending',
            passType: row.pass_type || 'One_day',
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
            hr_remarks: row.hr_remarks || '',
            requestDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A',
          };
        });
        setDataList(transformed);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }

  useEffect(() => {
    fetchVisits(true);
    fetchLiveAuditLogs();

    const interval = setInterval(() => {
      fetchVisits(false);
      fetchLiveAuditLogs();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedVisitor) {
      setPanelRemark(selectedVisitor.hr_remarks || '');
    }
  }, [selectedVisitor]);

  const handleUpdateStatus = async (visitId: string | null, newStatus: 'Approved' | 'Denied' | null, remarkText: string) => {
    if (!visitId || !newStatus) return;
    try {
      const nowIso = new Date().toISOString();
      const updatePayload: any = { status: newStatus, hr_remarks: remarkText };
      if (newStatus === 'Approved') {
        updatePayload.approved_at = nowIso;
      }

      // ✅ FIX: Optimistic UI - Immediately update local state so it vanishes from the tab!
      setDataList(prev => prev.map(log => log.id === visitId ? { 
        ...log, 
        status: newStatus, 
        hr_remarks: remarkText,
        approvedAt: newStatus === 'Approved' ? new Date(nowIso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : log.approvedAt
      } : log));
      
      setRemarkModal({ isOpen: false, visitId: null, action: null, text: '' });
      setIsDrawerOpen(false); // ✅ Close drawer instantly
      
      await supabase.from('visits').update(updatePayload).eq('visit_id', visitId);
      
      await supabase.from('audit_logs').insert([{
        action: newStatus === 'Approved' ? 'approved' : 'rejected',
        remarks: `HOD ${newStatus} visitor pass ${visitId}. Note: ${remarkText || 'No remarks provided.'}`,
        performed_by: currentUser.userName, 
        performed_by_role: 'hr'
      }]);

      fetchLiveAuditLogs();
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to process status change.");
    }
  };

  const handleEmergencyRevoke = async () => {
    if (!emergencyModal || !emergencyReason) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      
      // ✅ Optimistic UI - Vanish from Active Passes Tab
      setDataList(prev => prev.map(log => log.id === emergencyModal.visitId ? { ...log, status: 'Revoked', checkoutTime: new Date(now).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } : log));
      setEmergencyModal(null); 
      setEmergencyReason('');

      await supabase.from('visits').update({ status: 'Revoked', actual_out: now }).eq('visit_id', emergencyModal.visitId);
      await supabase.from('visitors').update({ checked_out_time: now }).eq('visitor_id', emergencyModal.visitorId);
      
      await supabase.from('forensic_incidents').insert([{
        visitor_id: emergencyModal.visitorId, 
        visit_id: emergencyModal.visitId, 
        incident_type: 'emergency_revocation', 
        severity: 'Critical',
        excess_minutes: 0,
        reason: `HOD INITIATED KICK-OUT: ${emergencyReason}`, 
        reported_by: currentUser.userName || 'HOD Desk', 
        status: 'open'
      }]);

      await supabase.from('audit_logs').insert([{
        visitor_id: emergencyModal.visitorId, 
        action: 'emergency_removal', 
        performed_by_id: currentUser.empId || 'HOD-000', 
        performed_by: currentUser.userName || 'HOD Admin',
        performed_by_role: 'hr', 
        severity: 'Critical', 
        remarks: `[EMERGENCY REVOCATION BY HOD]: ${emergencyReason}`
      }]);

      fetchVisits(false); 
      fetchLiveAuditLogs();
    } catch (error) { 
      console.error(error);
      alert('Failed to process emergency removal.'); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleUpdateRemarkOnly = async (visitId: string, remarkText: string) => {
    try {
      setDataList(prev => prev.map(log => log.id === visitId ? { ...log, hr_remarks: remarkText } : log));
      const { error } = await supabase.from('visits').update({ hr_remarks: remarkText }).eq('visit_id', visitId);
      if (error) throw error;
      alert("Internal note updated successfully!");
    } catch (error) {
      console.error('Error updating remark:', error);
      alert("Failed to save note.");
    }
  };

  const handleFilterToggle = (groupKey: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[groupKey] || [];
      const updated = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
      return { ...prev, [groupKey]: updated };
    });
  };

  const handleOpenDrawer = (visitor: ExtendedVisitorRecord) => {
    setSelectedVisitor(visitor);
    setIsDrawerOpen(true);
  };

  const matrixFilteredRows = dataList.filter(row => {
    const matchesSearch = row.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) || row.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = (selectedFilters.category.length === 0) || selectedFilters.category.includes(row.category || '');
    const matchesPipeline = (selectedFilters.pipeline || []).includes(row.pipeline);
    const matchesStatus = (selectedFilters.status || []).includes(row.status);

    let matchesTab = true;
    if (activeTab === 'Pending Verification') matchesTab = row.status === 'Pending';
    if (activeTab === 'Active Passes') matchesTab = row.status === 'Approved' || row.status === 'Active';

    return matchesSearch && matchesCategory && matchesPipeline && matchesStatus && matchesTab;
  });

  const hrFilterGroups = [
    { key: 'category', title: 'Category Tracks', options: [ { label: 'Government / Defence', value: 'Govt' }, { label: 'Foreign Nationals', value: 'Foreign' }, { label: 'Service / Vendors', value: 'Service' }, { label: 'General Walk-ins', value: 'General' },{ label: 'HOD Registry', value: 'HOD' } ] },
    { key: 'pipeline', title: 'Pipeline Types', options: [ { label: 'Immediate Access', value: 'immediate' }, { label: 'Pre-Scheduled Entry', value: 'scheduled' }, { label: 'Repeated Framework', value: 'repeated' } ] },
    { key: 'status', title: 'Pass Clearance Status', options: [ { label: 'Pending Review', value: 'Pending' }, { label: 'Approved Access', value: 'Approved' }, { label: 'Active On-Site', value: 'Active' }, { label: 'Cleared Outposts', value: 'Cleared' } ] }
  ];

  const columns: TableColumn<ExtendedVisitorRecord>[] = [
    { key: 'id', label: 'PASS ID', render: (row) => <span className="text-blue-600 font-mono font-bold text-xs">{row.id}</span> },
    { key: 'visitorName',
      label: 'VISITOR DETAILS',
      render: (row) => ( 
      <div>
        <div className="font-semibold text-slate-800 text-sm">{row.visitorName}</div>
        <div className="text-xs text-slate-500 font-mono">{row.phone}</div>
        <div className="text-xs text-slate-500 font-mono">{row.email}</div> 
      </div> ) 
    },
    { key: 'category', label: 'CATEGORY', render: (row) => {
        const colors: Record<string, string> = { HOD: 'bg-purple-50 text-purple-500 border-purple-100', Govt:'bg-emerald-50 text-emerald-500 border-emerald-100', Foreign: 'bg-amber-50 text-amber-500 border-amber-100', Service: 'bg-orange-50 text-orange-500 border-orange-100', General: 'bg-blue-50 text-blue-500 border-blue-100' };
        const safeCategory = row.category || 'General';
        return <span className={`px-2 py-0.5 text-xs font-bold rounded border ${colors[safeCategory] || 'bg-slate-100'}`}>{safeCategory}</span>;
      }
    },
    { key: 'pipeline', label: 'PIPELINE TYPE', render: (row) => <span className="text-xs uppercase font-semibold text-slate-500 font-mono tracking-wider">{row.pipeline}</span> },
    { key: 'purpose', label: 'PURPOSE OBJECTIVE', render: (row) => <p className="text-xs text-slate-600 max-w-[140px] truncate" title={row.purpose}>{row.purpose}</p> },
    { key: 'hostName', label: 'ASSIGNED HOST', render: (row) => <span className="text-slate-700 font-medium text-xs">{row.hostName}</span> },
    { key: 'status', label: 'STATUS', render: (row) => {
        if (row.status === 'Approved' || row.status === 'Active') return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded font-medium border border-emerald-200">Active</span>;
        if (row.status === 'Pending') return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded font-medium border border-amber-200">Pending</span>;
        if (row.status === 'Denied' || row.status === 'Revoked') return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs rounded font-medium border border-rose-200">{row.status}</span>;
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{row.status}</span>;
      }
    },
    {
  key: 'timing',
  label: 'APPROVAL / CHECKOUT / EXPIRY',
  render: (row) => (
    <div className="space-y-1">
      <div className="text-[11px] text-slate-500 font-mono">
        <span className="font-semibold text-emerald-600">Approved:</span> {row.approvedAt !== 'N/A' ? row.approvedAt : '--'}
      </div>
      <div className="text-[11px] text-slate-500 font-mono">
        <span className="font-semibold text-rose-600">Checkout:</span> {row.checkoutTime !== 'N/A' ? row.checkoutTime : '--'}
      </div>
      <div className="text-[11px] text-slate-500 font-mono">
        <span className="font-semibold text-amber-600">Expiry:</span> {row.endDate}
      </div>
    </div>
  )
},
    { key: 'id', label: 'ACTIONS', render: (row) => (
        <div className="flex items-center space-x-1">
          {row.status === 'Pending' && (
            <>
              <button onClick={() => setRemarkModal({ isOpen: true, visitId: row.id, action: 'Approved', text: row.hr_remarks || '' })} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => setRemarkModal({ isOpen: true, visitId: row.id, action: 'Denied', text: row.hr_remarks || '' })} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Deny"><X className="w-4 h-4" /></button>
            </>
          )}
          {row.status === 'Active' && (
            <button onClick={() => setEmergencyModal({isOpen: true, visitId: row.id, visitorId: row.visitorId, name: row.visitorName})} className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Emergency Revoke Access">
              <AlertOctagon className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => handleOpenDrawer(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Open Clearance Drawer"><Eye className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  const getAuditColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('approved') || lowerAction.includes('checked_in')) return 'bg-emerald-50 border-emerald-100 text-emerald-800';
    if (lowerAction.includes('rejected') || lowerAction.includes('denied') || lowerAction.includes('emergency')) return 'bg-rose-50 border-rose-100 text-rose-800';
    if (lowerAction.includes('checked_out')) return 'bg-blue-50 border-blue-100 text-blue-800';
    return 'bg-amber-50 border-amber-100 text-amber-800'; 
  };

  if (loading) {
    return (
    <DashboardLayout role="hr" userName={currentUser.userName} headerAction={<HRNotificationCenter />} avatarUrl={currentUser.avatarUrl}>
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
    <DashboardLayout 
      role="hr" 
      userName={currentUser.userName}
      headerAction={<HRNotificationCenter />}
      avatarUrl={currentUser.avatarUrl}  
    >

      <div className="max-w-7xl mx-auto space-y-6">

        {/* PAGE HEADER */}
        <div className="mb-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">HOD Administration & Access Control</p>
        </div>
        
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
              <DataTable data={matrixFilteredRows} columns={columns} />
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base mb-4">Command Quick Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <Link to="/hod/visitormgmt" className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-slate-50/50 transition-all group">
                  <div className="flex items-center text-sm font-medium text-slate-700">
                    <UserPlus className="w-4 h-4 mr-3 text-slate-400 group-hover:text-blue-500" />
                    Launch Visitor Onboarding
                  </div>
                  <span className="text-xs text-slate-400">Go →</span>
                </Link>
                <Link to="/hod/hodrep" className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-amber-500 hover:bg-slate-50/50 transition-all group">
                  <div className="flex items-center text-sm font-medium text-slate-700">
                    <History className="w-4 h-4 mr-3 text-slate-400 group-hover:text-amber-500" />
                    Review Repeated Manifests
                  </div>
                  <span className="text-xs text-slate-400">View →</span>
                </Link>
                <Link to="/hod/audit" className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-purple-500 hover:bg-slate-50/50 transition-all cursor-pointer group">
                  <div className="flex items-center text-sm font-medium text-slate-700">
                    <Shield className="w-4 h-4 mr-3 text-slate-400 group-hover:text-purple-500" />
                    Full Security Audit Trail
                  </div>
                  <span className="text-xs text-slate-400">View 🛡️</span>
                </Link>
              </div>
            </div>

            {/* REAL DATABASE LIVE AUDIT PANEL */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3 shrink-0">
                <h3 className="font-bold text-slate-800 text-base flex items-center">
                  <Bell className="w-4 h-4 mr-2 text-slate-500" />
                  Live Activity Broadcast
                </h3>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs custom-scrollbar">
                {liveAuditLogs.length > 0 ? (
                  liveAuditLogs.map((log) => {
                    const timeFormatted = new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const colorClass = getAuditColor(log.action);
                    return (
                      <div key={log.id} className={`p-3 border rounded-lg transition-all duration-300 ${colorClass}`}>
                        <div className="flex justify-between font-bold text-[10px] uppercase tracking-wider mb-1">
                          <span>{log.action.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-slate-500">{timeFormatted}</span>
                        </div>
                        <p className="font-medium text-xs leading-snug">{log.remarks}</p>
                        <div className="mt-2 pt-2 border-t border-black/5 flex justify-between text-[9px] uppercase tracking-widest text-slate-500">
                          <span>By: {log.performed_by}</span>
                          <span className="font-mono">{log.performed_by_role}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Clock className="w-8 h-8 mb-2 opacity-50" />
                    <p>No recent activity detected.</p>
                  </div>
                )}
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
              {(() => {
                const isForeign = selectedVisitor.category === 'Foreign';
                const isGovt = selectedVisitor.category === 'Govt';
                const isHR = selectedVisitor.category === 'HOD';
                const isService = selectedVisitor.category === 'Service';

                const orgLabel = isGovt ? 'Command Ministry' : isService ? 'Contracting Agency' : isForeign ? 'Global Organization' : isHR ? 'Sponsoring Inst.' : 'Organization';
                const desigLabel = isGovt ? 'Official Rank' : isService ? 'Field Trade' : isForeign ? 'Diplomatic Rank' : isHR ? 'HR Track' : 'Designation';
                
                const tagMatch = selectedVisitor.purpose.match(/^\[(.*?)\]\s*(.*)/);
                const secureTag = tagMatch ? tagMatch[1] : null;
                const cleanPurpose = tagMatch ? tagMatch[2].split(' | Accompanying')[0] : selectedVisitor.purpose.split(' | Accompanying')[0];

                return (
                  <>
                    <section>
                      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-amber-600" /> Audit & Request Tracking
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Requested By</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.hostName}</span></div>
                        <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Request Date</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.requestedAt}</span></div>
                        <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Scheduled Visit</span><span className="col-span-2 font-medium text-slate-900 text-blue-600">{selectedVisitor.visitDate}</span></div>
                        {selectedVisitor.checkoutTime && (
                            <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Gate Check-Out</span><span className="col-span-2 font-medium text-slate-900 text-rose-600">{selectedVisitor.checkoutTime !== 'N/A' ? selectedVisitor.checkoutTime : 'Pending / NA'}</span></div>
                          )}
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100"><span className="text-slate-500">Authorized Pass</span><span className="col-span-2 font-black text-slate-800 capitalize tracking-wide">{selectedVisitor.passType}</span></div>
                          <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Expiry Target</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.endDate}</span></div>
                          <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Validity Status</span><span className={`col-span-2 font-bold ${selectedVisitor.daysLeft === 'Expired' ? 'text-rose-600' : 'text-emerald-600'}`}>{selectedVisitor.daysLeft}</span></div>                        
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
                        
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100"><span className="text-slate-500">{selectedVisitor.id_type || 'ID Type'}</span><span className="col-span-2 font-bold text-slate-900 font-mono tracking-wider">{selectedVisitor.id_number}</span></div>
                        <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">{orgLabel}</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.organization}</span></div>
                        <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">{desigLabel}</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.designation}</span></div>
                        
                        {secureTag && (
                          <div className="grid grid-cols-3 gap-2 bg-amber-50 p-2 rounded border border-amber-100 mt-2">
                            <span className="text-amber-700 font-semibold">{secureTag.split(':')[0]}</span>
                            <span className="col-span-2 font-bold text-amber-900 font-mono">{secureTag.split(':')[1]}</span>
                          </div>
                        )}
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
                          <span className="text-slate-500 block mb-1 mt-2">Declared Purpose</span>
                          <div className="bg-white p-3 border border-slate-200 rounded-lg leading-relaxed shadow-sm text-slate-800 text-xs font-medium">
                            {cleanPurpose}
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
                          {selectedVisitor.escorts.map((escort: any, idx: number) => (
                            <div key={idx} className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm text-sm">
                              <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500">Name</span><span className="col-span-2 font-medium text-slate-900">{escort.name}</span></div>
                              <div className="grid grid-cols-3 gap-1"><span className="text-slate-500">{escort.id_type || 'ID'}</span><span className="col-span-2 font-medium text-slate-900 font-mono">{escort.govId || escort.id_number}</span></div>
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
                  </>
                );
              })()}
            </div>

            {/* RESTORED BOTTOM PANEL */}
            <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Internal HOD Remarks
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

      {/* ✅ Security Remark Approve/Deny Modal */}
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

      {/* ✅ HR Emergency Revoke Modal */}
      {emergencyModal?.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100 transform scale-100 transition-all">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-rose-800 flex items-center"><AlertOctagon className="w-5 h-5 mr-2"/> CRITICAL: Emergency Revocation</h3>
                <p className="text-xs text-rose-600 mt-0.5">{emergencyModal.name} ({emergencyModal.visitorId})</p>
              </div>
              <button onClick={() => setEmergencyModal(null)} className="text-rose-400 hover:text-rose-700"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm font-medium text-slate-600">This action immediately revokes access, creates a CRITICAL forensic log, and explicitly alerts Security for immediate removal. This cannot be undone.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Removal (Required)</label>
                <textarea autoFocus value={emergencyReason} onChange={e => setEmergencyReason(e.target.value)} rows={3} placeholder="Describe security breach, policy violation, etc..." className="w-full border border-rose-200 rounded-lg p-3 text-sm focus:outline-none focus:border-rose-400 bg-rose-50/50 resize-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEmergencyModal(null)} className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 border border-slate-200">Cancel</button>
                <button onClick={handleEmergencyRevoke} disabled={!emergencyReason || isProcessing} className="flex-1 py-2.5 font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm disabled:opacity-50">
                  {isProcessing ? 'Alerting Security...' : 'Confirm Revocation'}
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