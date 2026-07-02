// File: src/pages/hr/visitormgmt.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, Landmark, Globe, ShieldAlert, Wrench, Eye, CheckCircle, XCircle, X, Shield, Building, FileText, Clock, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { VisitorRecord, TableColumn } from '../../types/visitor';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../hooks/useNotification';
import NotificationToast from '../../components/common/NotificationToast';
import HRNotificationCenter from './HRNotificationCenter';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';


export interface ExtendedVisitorRecord extends VisitorRecord {
  requestedAt: string;
  visitDate: string;
  passType: string;
  checkoutTime?: string;
  approvedAt?: string;
}

export default function VisitorMgmtPage() {
  const { notifications, addNotification, removeNotification } = useNotification();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // FIX: Updated to requested tab categories
  const [activeTab, setActiveTab] = useState('All Passes');

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    category: [],
    pipeline: [],
    status: []
  });

  const [visitorLogs, setVisitorLogs] = useState<ExtendedVisitorRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<ExtendedVisitorRecord | null>(null);
  const [currentUserName, setCurrentUserName] = useState('Loading...');

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUserName(emp.name);
        } catch(e) {
          setCurrentUserName('HR Admin');
        }
      }
    };
    loadUserProfile();
  }, []);
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

  useEffect(() => {
    if (selectedVisitor) {
      setPanelRemark(selectedVisitor.hr_remarks || '');
    }
  }, [selectedVisitor]);

  const fetchVisitorLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          visitors (*),
          escorts (*),
          host:employees!visits_host_employee_id_fkey (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const transformed: ExtendedVisitorRecord[] = data.map((row: any) => {
          let uiPipeline = 'Walk in';
          const dbType = row.visit_type?.toLowerCase();
          if (dbType === 'prescheduled' || dbType === 'scheduled') uiPipeline = 'Pre-Scheduled';
          if (dbType === 'repeated') uiPipeline = 'Repeated';

          let computedCategory = 'General';
          if (row.visit_type) {
            const type = row.visit_type.toLowerCase();
            if (type.includes('govt')) computedCategory = 'Govt';
            else if (type.includes('hr')) computedCategory = 'HR';
            else if (type.includes('service')) computedCategory = 'Service';
            else if (type.includes('foreign')) computedCategory = 'Foreign';
          } else if (row.visitors?.nationality?.toLowerCase() !== 'indian') {
            computedCategory = 'Foreign';
          }
          const escortsArray = Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []);
          
          return {
            id: row.visit_id, 
            visitorName: row.visitors?.name || 'Unknown',
            gender: row.visitors?.gender || 'Others',
            phone: row.visitors?.phone || 'N/A',
            email: row.visitors?.email || 'N/A',
            category: computedCategory, 
            purpose: row.purpose || 'General Entry',
            hostName: row.host?.name || 'Unassigned',
            hostDept: row.host?.role === 'hr' ? 'HR Officer' : 'Staff Member',
            hostId: row.host?.employee_id || 'N/A',
            requestedAt: row.created_at ? new Date(row.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A',
            visitDate: row.start_date ? new Date(row.start_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
            checkoutTime: row.actual_out ? new Date(row.actual_out).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A',
            approvedAt: row.updated_at ? new Date(row.updated_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A',
            status: row.status || 'Pending',
            passType: row.pass_type || 'ONE_DAY',
            pipeline: uiPipeline,
            nationality: row.visitors?.nationality || 'Indian',
            organization: row.visitors?.organization || 'N/A',
            designation: row.visitors?.designation || 'N/A',
            documentUrl: row.visitors?.document_url || row.document_url || null,
            escorts: escortsArray,
            dob: row.visitors?.dob || 'N/A',
            id_type: row.visitors?.id_type || 'Govt ID',
            id_number: row.visitors?.id_number || 'N/A',
            address: row.visitors?.address || 'N/A',
            department: row.department || 'General Unit',
            hr_remarks: row.hr_remarks || '',
            requestDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'
          };
        });

        setVisitorLogs(transformed);
      }
    } catch (error) {
      console.error('Error hydrating visitor management registry:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitorLogs();
  }, []);

  const handleConfirmAction = async (visitId: string | null, newStatus: 'Approved' | 'Denied' | null, remarkText: string) => {
    if (!visitId || !newStatus) return;
    try {
      const updatePayload: any = { status: newStatus, hr_remarks: remarkText };
      if (newStatus === 'Approved') {
        updatePayload.approved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('visits')
        .update(updatePayload)
        .eq('visit_id', visitId);

      if (error) throw error;
      
      const targetVisitor = visitorLogs.find(v => v.id === visitId);
      if (targetVisitor) {
        await supabase.from('audit_logs').insert([{
          visitor_id: targetVisitor.id,
          action: newStatus === 'Approved' ? 'approved' : 'rejected',
          performed_by: 'HR Officer',
          performed_by_role: 'hr',
          remarks: remarkText ? `HR Decision: ${remarkText}` : `Request ${newStatus} by HR`
        }]);
      }
      
      setVisitorLogs(prev => prev.map(log => log.id === visitId ? { ...log, status: newStatus, hr_remarks: remarkText, approvedAt: new Date().toLocaleString('en-GB') } : log));
      if (selectedVisitor?.id === visitId) {
        setSelectedVisitor(prev => prev ? { ...prev, status: newStatus, hr_remarks: remarkText, approvedAt: new Date().toLocaleString('en-GB') } : null);
      }
      
      setRemarkModal({ isOpen: false, visitId: null, action: null, text: '' });
      setIsDrawerOpen(false);
      addNotification('success', `Visitor request has been ${newStatus.toLowerCase()} successfully!`);
    } catch (err) {
      addNotification('error', "Failed to process status change.");
    }
  };

  const handleUpdateRemarkOnly = async (visitId: string, remarkText: string) => {
    try {
      const { error } = await supabase.from('visits').update({ hr_remarks: remarkText }).eq('visit_id', visitId);
      if (error) throw error;
      
      setVisitorLogs(prev => prev.map(log => log.id === visitId ? { ...log, hr_remarks: remarkText } : log));
      if (selectedVisitor?.id === visitId) setSelectedVisitor(prev => prev ? { ...prev, hr_remarks: remarkText } : null);
      addNotification('success', "Internal note updated successfully!");
    } catch (error) {
      addNotification('error', "Failed to save note.");
    }
  };

  const visitorFilterGroups = [
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
        { label: 'Walk-in', value: 'Walk-in' },
        { label: 'Pre-Scheduled', value: 'Pre-Scheduled' },
        { label: 'Repeated', value: 'Repeated' }
      ]
    },
    {
      key: 'status',
      title: 'Clearance Status',
      options: [
        { label: 'Pending Review', value: 'Pending' },
        { label: 'Approved Access', value: 'Approved' },
        { label: 'Denied Entries', value: 'Denied' },
        { label: 'Revoked', value: 'Revoked' }
      ]
    }
  ];

  const handleFilterToggle = (groupKey: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[groupKey] || [];
      const updated = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
      return { ...prev, [groupKey]: updated };
    });
  };

  const matrixFilteredRows = useMemo(() => {
    return visitorLogs.filter(row => {
      const matchesSearch = row.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) || row.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = (selectedFilters.category.length === 0) || selectedFilters.category.includes(row.category || '');
      const matchesPipeline = (selectedFilters.pipeline.length === 0) || selectedFilters.pipeline.includes(row.pipeline);
      const matchesStatus = (selectedFilters.status.length === 0) || selectedFilters.status.includes(row.status);

      // FIX: Implemented logic for new tabs
      let matchesTab = true;
      if (activeTab === 'Pending') matchesTab = row.status === 'Pending';
      if (activeTab === 'Active') matchesTab = row.status === 'Active';
      if (activeTab === 'Checked Out') matchesTab = row.status === 'Completed' || row.status === 'Revoked';
      if (activeTab === 'Expired') matchesTab = row.status === 'Expired' || row.status === 'Denied';

      return matchesSearch && matchesCategory && matchesPipeline && matchesStatus && matchesTab;
    });
  }, [visitorLogs, searchTerm, selectedFilters, activeTab]);

  const categories = [
    { type: 'General', label: 'General Pass', desc: 'Standard public walk-ins, temporary business visits, or casual meetings.', icon: User, color: 'border-blue-100 hover:border-blue-300 hover:shadow-blue-50/50 hover:bg-blue-50 ', iconBg: 'bg-blue-50 text-blue-600', path: '/hr/add_visitor_general' },
    { type: 'HR', label: 'HR Registry', desc: 'Candidate interviews, employee onboardings, and internal hr syncs.', icon: ShieldAlert, color: 'border-purple-100 hover:border-purple-300 hover:shadow-purple-50/50 hover:bg-purple-50', iconBg: 'bg-purple-50 text-purple-600', path: '/hr/add_visitor_hr' },
    { type: 'Govt', label: 'Govt / Defense', desc: 'High-security clearance pathways for officials and ministry personnel.', icon: Landmark, color: 'border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-50/50 hover:bg-emerald-50', iconBg: 'bg-emerald-50 text-emerald-600', path: '/hr/add_visitor_govt' },
    { type: 'Foreign', label: 'Foreign National', desc: 'International delegates, international passports, embassy tracks.', icon: Globe, color: 'border-amber-100 hover:border-amber-300 hover:shadow-amber-50/50 hover:bg-amber-50', iconBg: 'bg-amber-50 text-amber-600', path: '/hr/add_visitor_foreign' },
    { type: 'Service', label: 'Service / Vendor', desc: 'Maintenance, infrastructure crews, and outsourced service tokens.', icon: Wrench, color: 'border-orange-100 hover:border-orange-300 hover:shadow-orange-50/50 hover:bg-orange-50/50', iconBg: 'bg-orange-50 text-orange-600', path: '/hr/add_visitor_service' },
  ];

  const columns: TableColumn<ExtendedVisitorRecord>[] = [
    {
      key: 'hostName',
      label: 'HOST DETAILS',
      render: (row) => (
        <div>
          <div className="text-slate-800 font-medium text-xs">{row.hostName}</div>
          <div className="text-xs text-slate-500">{row.hostDept}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5 font-mono">{row.hostId}</div>
        </div>
      )
    },
    { key: 'id', label: 'PASS ID', render: (row) => <span className="text-blue-500 font-mono font-semibold text-xs">{row.id}</span> },
    {
      key: 'visitorName',
      label: 'VISITOR DETAILS',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800 text-sm">{row.visitorName}</div>
          <div className="text-xs text-slate-500 font-mono">{row.phone}</div>
          <div className="text-xs text-slate-400">{row.email}</div>
        </div>
      )
    },
    {
      key: 'timing',
      label: 'REQUEST & ENTRY TIMING',
      render: (row) => (
        <div>
          <div className="text-[11px] text-slate-500 mb-0.5 font-mono"><span className="font-semibold text-slate-700">Req:</span> {row.requestedAt}</div>
          <div className="text-[11px] text-slate-500 font-mono"><span className="font-semibold text-blue-600">Entry:</span> {row.visitDate}</div>
        </div>
      )
    },
    {
      key: 'checkout',
      label: 'CHECKOUT / STATUS LOG',
      render: (row) => (
        <div>
          <div className="text-[11px] text-slate-500 mb-0.5 font-mono"><span className="font-semibold text-emerald-600">Approved:</span> {row.approvedAt !== 'N/A' ? row.approvedAt : '--'}</div>
          <div className="text-[11px] text-slate-500 font-mono"><span className="font-semibold text-rose-600">Checkout:</span> {row.checkoutTime !== 'N/A' ? row.checkoutTime : '--'}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY',
      render: (row) => {
        const cat = row.category || 'General';
        if (cat === 'General') return <span className="font-bold text-blue-600 text-xs uppercase tracking-wide">General Pass</span>;
        if (cat === 'HR') return <span className="font-bold text-purple-600 text-xs uppercase tracking-wide">HR Registry</span>;
        if (cat === 'Govt') return <span className="font-bold text-emerald-600 text-xs uppercase tracking-wide">Govt/Defence</span>;
        if (cat === 'Foreign') return <span className="font-bold text-amber-600 text-xs uppercase tracking-wide">Foreign National</span>;
        return <span className="font-bold text-orange-600 text-xs uppercase tracking-wide">Service</span>;
      }
    },
    {
      key: 'purpose',
      label: 'PURPOSE',
      render: (row) => <div className="text-xs text-slate-600 font-medium line-clamp-1 max-w-[150px]">{row.purpose}</div>
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => {
        if (row.status === 'Active') return <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] uppercase tracking-wider rounded font-bold">On Campus</span>;
        if (row.status === 'Completed') return <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 text-[10px] uppercase tracking-wider rounded font-bold">Checked Out</span>;
        if (row.status === 'Approved') return <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] uppercase tracking-wider rounded font-bold">Approved</span>;
        if (row.status === 'Pending') return <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-[10px] uppercase tracking-wider rounded font-bold animate-pulse">Action Req</span>;
        if (row.status === 'Denied') return <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[10px] uppercase tracking-wider rounded font-bold">Denied</span>;
        if (row.status === 'Revoked') return <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[10px] uppercase tracking-wider rounded font-bold">Revoked</span>;
        if (row.status === 'Expired') return <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 text-[10px] uppercase tracking-wider rounded font-bold">Expired</span>;
        return <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider rounded font-bold">{row.status}</span>;
      }
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      render: (row) => (
        <div className="flex items-center space-x-1">
          {row.status === 'Pending' && (
            <>
              <button onClick={() => setRemarkModal({ isOpen: true, visitId: row.id, action: 'Approved', text: row.hr_remarks || '' })} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve Request">
                <CheckCircle className="w-4 h-4" />
              </button>
              <button onClick={() => setRemarkModal({ isOpen: true, visitId: row.id, action: 'Denied', text: row.hr_remarks || '' })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Decline Request">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => { setSelectedVisitor(row); setIsDrawerOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Review Full Details">
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <DashboardLayout role="hr" userName={currentUserName}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-full mb-4"></div>
            <p className="text-slate-500 font-medium">Syncing Master Security Manifest...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="hr" userName={currentUserName} headerAction={<HRNotificationCenter />}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Visitor Clearance Management</h1>
            <p className="text-sm text-slate-500">Review pending requests and manage facility access approvals.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Pending HR Review', value: visitorLogs.filter(d => d.status === 'Pending').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { title: 'Approved (Awaiting Gate)',  value: visitorLogs.filter(d => d.status === 'Approved').length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { title: 'Active On-Site', value: visitorLogs.filter(d => d.status === 'Active').length.toString(), icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { title: 'Denied / Revoked', value: visitorLogs.filter(d => d.status === 'Denied' || d.status === 'Revoked').length.toString(), icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' }
          ].map((stat, idx) => (  
            <div key={idx} className="bg-white p-5 border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} border ${stat.border}`}><stat.icon className="w-5 h-5" /></div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SELECT VISITOR CATEGORY</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select the most appropriate category to manually register a walk-in.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.type} onClick={() => navigate(cat.path)} className={`group bg-white border rounded-xl p-5 flex flex-col justify-between items-start cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden ${cat.color}`}>
                  <div className="w-full">
                    <div className={`p-2.5 rounded-lg w-fit mb-4 transition-all duration-200 ${cat.iconBg}`}><Icon className="w-5 h-5" /></div>
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-slate-900">{cat.label}</h4>
                    <p className="text-[11px] leading-relaxed text-slate-400 font-medium mt-1.5 line-clamp-2">{cat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Master Security Manifest Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">Historical and active verification records registry</p>
          </div>

          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <SearchFilterBar value={searchTerm} onChange={setSearchTerm} selectedFilters={selectedFilters} onFilterToggle={handleFilterToggle} filterGroups={visitorFilterGroups} placeholder="Search by visitor name or Pass ID..." />
          </div>

          <div className="flex border-b border-slate-200 text-xs font-semibold space-x-4">
            {['All Passes', 'Pending', 'Active', 'Checked Out', 'Expired'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 px-1 relative ${activeTab === tab ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <DataTable data={matrixFilteredRows} columns={columns} />
          </div>
        </div>

{isDrawerOpen && selectedVisitor && (
          <div className="fixed inset-0 z-[80] overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
            
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Clearance Review</h2>
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedVisitor.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                    selectedVisitor.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                    selectedVisitor.status === 'Completed' ? 'bg-slate-100 text-slate-800' :
                    selectedVisitor.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                    selectedVisitor.status === 'Pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedVisitor.status}
                  </span>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                {(() => {
                  const isForeign = selectedVisitor.category === 'Foreign';
                  const isGovt = selectedVisitor.category === 'Govt';
                  const isHR = selectedVisitor.category === 'HR';
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
                    Internal HR Remarks
                  </label>
                  <button onClick={() => handleUpdateRemarkOnly(selectedVisitor.id, panelRemark)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition-colors">
                    Save Note
                  </button>
                </div>
                
                <textarea
                  rows={3}
                  value={panelRemark}
                  onChange={(e) => setPanelRemark(e.target.value)}
                  placeholder="Add context, acceptance reasoning, or decline criteria..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none mb-4"
                />

                {selectedVisitor.status === 'Pending' && (
                  <div className="flex gap-3">
                    <button onClick={() => handleConfirmAction(selectedVisitor.id, 'Denied', panelRemark)} className="flex-1 py-2.5 bg-red-50 text-red-700 font-bold text-xs rounded-xl hover:bg-red-100 border border-red-100 transition-colors">
                      Decline Access
                    </button>
                    <button onClick={() => handleConfirmAction(selectedVisitor.id, 'Approved', panelRemark)} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-sm transition-colors">
                      Authorize Access
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

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
                  <button onClick={() => setRemarkModal({ isOpen: false, visitId: null, action: null, text: '' })} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => handleConfirmAction(remarkModal.visitId, remarkModal.action, remarkModal.text)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${remarkModal.action === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    Confirm {remarkModal.action}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      
      <NotificationToast notifications={notifications} onRemove={removeNotification} />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </DashboardLayout>
  );
}