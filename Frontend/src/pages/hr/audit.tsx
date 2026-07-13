// src/pages/hr/audit_logs.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { TableColumn } from '../../types/visitor';
import { Shield, Eye, X, User, Activity, Clock, FileText, Download, AlertOctagon, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';
import NotificationToast from '../../components/common/NotificationToast';
import HRNotificationCenter from './HRNotificationCenter';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';

interface ExtendedAuditLog {
  id: string;
  timestamp: string;
  raw_date: Date;
  action: string;
  readable_action: string;
  remarks: string;
  severity: string;
  performed_by_role: string;
  performer_name: string;
  performer_id: string;
  performer_email: string;
  performer_phone: string;
  visitor_name: string;
  visitor_id: string;
  visitor_phone: string;
}

export default function AuditLogsPage() {
  const {notifications, addNotification, removeNotification} = useNotification();
  const [activeTab, setActiveTab] = useState<'Account Requests' | 'System Logs'>('System Logs');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const [logs, setLogs] = useState<ExtendedAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
    // Dynamic User State
  const [currentUser, setCurrentUser] = useState({ userName: 'Loading...', avatarUrl: '' }  );

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUser({ userName: emp.name, avatarUrl: emp.avatar_url || '' });
        } catch(e) {
          setCurrentUser({ userName: 'HOD Admin', avatarUrl: '' });
        }
      }
    };
    loadUserProfile();
  }, []);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    action: [],
    role: [],
    severity: []
  });
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ExtendedAuditLog | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Pending Account Requests
      const { data: requests } = await supabase
        .from('employee_registrations')
        .select('*')
        .ilike('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (requests) setPendingRequests(requests);

      // 2. Fetch System Logs
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          visitors (name, phone, email, id_number),
          employees (employee_id, name, email, phone)
        `)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const formattedLogs: ExtendedAuditLog[] = data.map((log: any) => {
        let readableAction = 'performed an action on';
        switch(log.action) {
          case 'checked_in': readableAction = 'checked in'; break;
          case 'checked_out': readableAction = 'checked out'; break;
          case 'approved': readableAction = 'approved access for'; break;
          case 'rejected': readableAction = 'denied access to'; break;
          case 'emergency_removal': readableAction = 'executed an emergency removal on'; break;
          case 'created': readableAction = 'requested a pass for'; break;
        }

        return {
          id: log.id,
          timestamp: new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          raw_date: new Date(log.timestamp),
          action: log.action,
          readable_action: readableAction,
          remarks: log.remarks || 'No additional remarks.',
          severity: log.severity || 'Low',
          performed_by_role: log.performed_by_role?.toUpperCase() || 'SYSTEM',
          performer_name: log.employees?.name || log.performed_by || 'System Automated',
          performer_id: log.employees?.employee_id || 'N/A',
          performer_email: log.employees?.email || 'N/A',
          performer_phone: log.employees?.phone || 'N/A',
          visitor_name: log.visitors?.name || 'Unknown Visitor',
          visitor_id: log.visitor_id || 'N/A',
          visitor_phone: log.visitors?.phone || 'N/A',
        };
      });

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching data:', error);
      addNotification('error', 'Failed to load visitor directory.');

    } finally {
      setLoading(false);
    }
  };

// --- ACCOUNT ACTION HANDLERS ---
  const handleApproveEmployee = async (user: any) => {
    // ✅ Optimistic UI: Make the row vanish instantly
    setPendingRequests(prev => prev.filter(req => req.id !== user.id));

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

      const { error: updateError } = await supabase.from('employee_registrations').update({ status: 'approved' }).eq('id', user.id);
      
      if (updateError) throw updateError;

      await supabase.from('audit_logs').insert([{
        action: 'account_approved',
        remarks: `HR authorized portal access for ${user.full_name} (${user.department})`,
        performed_by: currentUser.userName || 'HR Admin', 
        performed_by_role: 'hr'
      }]);

      addNotification('success', `Access approved for ${user.full_name}`);
    } catch (error: any) {
      console.error("Approval failed", error);
      
      if (error.code === '23505') {
        addNotification('success', "User is already an active employee! Updating request status...");
        await supabase.from('employee_registrations').update({ status: 'approved' }).eq('id', user.id);
      } else {
        addNotification('error', "Failed to approve user. Check console for details.");
        // Revert the optimistic update if it failed
        fetchData(); 
      }
    }
  };

  const handleRejectEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to decline access for ${name}?`)) return;
    
    // ✅ Optimistic UI: Make the row vanish instantly
    setPendingRequests(prev => prev.filter(req => req.id !== id));
    
    try {
      await supabase.from('employee_registrations').update({ status: 'rejected' }).eq('id', id);
      
      await supabase.from('audit_logs').insert([{
        action: 'account_rejected',
        remarks: `HR declined portal access request for ${name}.`,
        performed_by: currentUser.userName || 'HR Admin', 
        performed_by_role: 'hr'
      }]);

      addNotification('success', `Access declined for ${name}`);
    } catch (err) {
      addNotification('error', 'Failed to decline request.');
      fetchData(); // Revert on failure
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.visitor_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = selectedFilters.action.length === 0 || selectedFilters.action.includes(log.action);
      const matchesRole = selectedFilters.role.length === 0 || selectedFilters.role.includes(log.performed_by_role);
      const matchesSeverity = selectedFilters.severity.length === 0 || selectedFilters.severity.includes(log.severity);

      return matchesSearch && matchesAction && matchesRole && matchesSeverity;
    });
  }, [logs, searchTerm, selectedFilters]);

  const handleFilterToggle = (groupKey: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[groupKey] || [];
      const updated = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
      return { ...prev, [groupKey]: updated };
    });
  };

  const filterGroups = [
    {
      key: 'action',
      title: 'Action Type',
      options: [
        { label: 'Check-in', value: 'checked_in' },
        { label: 'Check-out', value: 'checked_out' },
        { label: 'Approvals', value: 'approved' },
        { label: 'Rejections / Denials', value: 'rejected' },
        { label: 'Emergency Removals', value: 'emergency_removal' }
      ]
    },
    {
      key: 'role',
      title: 'Performed By',
      options: [
        { label: 'HOD Officer', value: 'HR' },
        { label: 'Security Guard', value: 'SECURITY' },
        { label: 'Employee', value: 'EMPLOYEE' }
      ]
    },
    {
      key: 'severity',
      title: 'Severity Level',
      options: [
        { label: 'Low', value: 'Low' },
        { label: 'Medium', value: 'Medium' },
        { label: 'High', value: 'High' },
        { label: 'Critical', value: 'Critical' }
      ]
    }
  ];

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return alert("No data to export.");
    
    const headers = ['Timestamp', 'Log ID', 'Action', 'Performed By', 'Role', 'Visitor Name', 'Visitor ID', 'Severity', 'Remarks'];
    const csvRows = filteredLogs.map(log => [
      `"${log.timestamp}"`,
      `"${log.id}"`,
      `"${log.action}"`,
      `"${log.performer_name}"`,
      `"${log.performed_by_role}"`,
      `"${log.visitor_name}"`,
      `"${log.visitor_id}"`,
      `"${log.severity}"`,
      `"${log.remarks.replace(/"/g, '""')}"` 
    ].join(','));

    const csvData = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const today = new Date().toDateString();
  const metrics = {
    total: logs.length,
    critical: logs.filter(l => l.severity.toLowerCase() === 'critical').length,
    todayCheckins: logs.filter(l => l.action === 'checked_in' && l.raw_date.toDateString() === today).length,
    denials: logs.filter(l => l.action === 'rejected' || l.action === 'emergency_removal').length,
  };

  const columns: TableColumn<ExtendedAuditLog>[] = [
    {
      key: 'timestamp',
      label: 'TIMESTAMP',
      render: (row) => <span className="text-xs font-mono text-slate-600">{row.timestamp}</span>
    },
    {
      key: 'actor',
      label: 'PERFORMED BY',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800 text-sm">{row.performer_name}</div>
          <div className="text-[10px] font-mono text-slate-500 uppercase">{row.performed_by_role}</div>
        </div>
      )
    },
    {
      key: 'activity',
      label: 'ACTIVITY LOG',
      render: (row) => (
        <div className="text-sm text-slate-700">
          <span className="font-medium text-slate-500">{row.readable_action}</span> <span className="font-bold text-slate-900">{row.visitor_name}</span>
        </div>
      )
    },
    {
      key: 'severity',
      label: 'SEVERITY',
      render: (row) => {
        const isCritical = row.severity?.toLowerCase() === 'critical';
        const isHigh = row.severity?.toLowerCase() === 'high';
        return (
          <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${isCritical ? 'bg-red-100 text-red-700 border border-red-200' : isHigh ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
            {row.severity}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'DETAILS',
      render: (row) => (
        <button 
          onClick={() => { setSelectedLog(row); setIsDrawerOpen(true); }}
          className="px-3 py-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <Eye className="w-4 h-4" /> View
        </button>
      )
    }
  ];

  return (
    <DashboardLayout role="hr" userName={currentUser.userName} headerAction={<HRNotificationCenter/>} avatarUrl={currentUser.avatarUrl}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Security Audit & Access</h1>
            <p className="text-sm text-slate-500">Immutable ledger of all access grants, denials, and facility movements.</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-slate-200">
                    <button
            onClick={() => setActiveTab('System Logs')}
            className={`flex items-center px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'System Logs' 
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            System Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('Account Requests')}
            className={`flex items-center px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'Account Requests' 
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Account Creation Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>

        </div>
        {/* ==================================================== */}
        {/* TAB 1: EXISTING SYSTEM AUDIT LOGS                    */}
        {/* ==================================================== */}
        {activeTab === 'System Logs' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ledger Entries</p><p className="text-2xl font-bold text-slate-800 mt-1">{metrics.total}</p></div>
                <div className="p-3 rounded-lg bg-blue-50 text-blue-500 border border-blue-100"><FileText className="w-5 h-5" /></div>
              </div>
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Check-ins</p><p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.todayCheckins}</p></div>
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle className="w-5 h-5" /></div>
              </div>
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Denials & Removals</p><p className="text-2xl font-bold text-orange-600 mt-1">{metrics.denials}</p></div>
                <div className="p-3 rounded-lg bg-orange-50 text-orange-600 border border-orange-100"><XCircle className="w-5 h-5" /></div>
              </div>
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical Alerts</p><p className="text-2xl font-bold text-red-600 mt-1">{metrics.critical}</p></div>
                <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-100"><AlertOctagon className="w-5 h-5" /></div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex-1">
                  <SearchFilterBar 
                    value={searchTerm} 
                    onChange={setSearchTerm} 
                    selectedFilters={selectedFilters} 
                    onFilterToggle={handleFilterToggle} 
                    filterGroups={filterGroups} 
                    placeholder="Search by Employee, Visitor, or Pass ID..." 
                  />
                </div>
                <button 
                  onClick={exportToCSV}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400">Syncing secure logs...</div>
              ) : (
                <DataTable data={filteredLogs} columns={columns} />
              )}
            </div>
          </>
        )}
        {/* ==================================================== */}
        {/* TAB 2: PENDING ACCOUNT REQUESTS (No Right Drawer)    */}
        {/* ==================================================== */}
        {activeTab === 'Account Requests' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 pl-6">Applicant Name</th>
                    <th className="p-4">Contact Detail</th>
                    <th className="p-4">Department</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading requests...</td></tr>
                  ) : pendingRequests.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">No pending account requests found.</td></tr>
                  ) : (
                    pendingRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-900 text-sm">{req.full_name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">Requested {new Date(req.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-800 text-sm">{req.email}</div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">{req.phone}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded border border-slate-200">
                            {req.department}
                          </span>
                        </td>
                        <td className="p-4 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleRejectEmployee(req.id, req.full_name)}
                              className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-lg transition-colors flex items-center"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                            </button>
                            <button 
                              onClick={() => handleApproveEmployee(req)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve Access
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


      </div>

      {/* RIGHT SLIDE-OUT DRAWER (Only triggers from System Logs tab) */}
      {isDrawerOpen && selectedLog && activeTab === 'System Logs' && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h2 className="text-lg font-black flex items-center"><Activity className="w-5 h-5 mr-2" /> Activity Record</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">LOG ID: {selectedLog.id.split('-')[0].toUpperCase()}</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Timestamp</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center"><Clock className="w-4 h-4 mr-1.5 text-blue-500" /> {selectedLog.timestamp}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity</p>
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${selectedLog.severity.toLowerCase() === 'critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {selectedLog.severity}
                  </span>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-blue-500" /> Performed By (Actor)
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500 font-medium">Name</span><span className="col-span-2 font-bold text-slate-900">{selectedLog.performer_name}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500 font-medium">Role Type</span><span className="col-span-2 font-bold text-slate-900 uppercase text-xs">{selectedLog.performed_by_role}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500 font-medium">Emp ID</span><span className="col-span-2 font-mono text-slate-700">{selectedLog.performer_id}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500 font-medium">Email</span><span className="col-span-2 text-slate-700">{selectedLog.performer_email}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500 font-medium">Phone</span><span className="col-span-2 font-mono text-slate-700">{selectedLog.performer_phone}</span></div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-500" /> Target Subject (Visitor)
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500 font-medium">Name</span><span className="col-span-2 font-bold text-slate-900">{selectedLog.visitor_name}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500 font-medium">Pass ID</span><span className="col-span-2 font-mono font-bold text-blue-500">{selectedLog.visitor_id}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500 font-medium">Phone</span><span className="col-span-2 font-mono text-slate-700">{selectedLog.visitor_phone}</span></div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" /> Action & System Remarks
                </h3>
                <div className={`p-4 border rounded-xl shadow-sm text-sm font-medium ${selectedLog.action.includes('reject') || selectedLog.action.includes('emergency') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                  {selectedLog.remarks}
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />

      <NotificationToast notifications={notifications} onRemove={removeNotification} />
    </DashboardLayout>
  );
}