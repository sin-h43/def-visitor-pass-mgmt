// pages/emp/index.tsx
import { useState, useMemo, useEffect } from 'react';
import { UserPlus, FileText, Eye, RefreshCw, MoreVertical, X, Shield, User, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterMatrix from '../../components/common/SearchFilterMatrix';
import { supabase } from '../../lib/supabase';

interface VisitorRecord {
  id: string;
  id_type: string;
  id_number: string;
  visitorName: string;
  phone: string;
  email: string;
  dob: string;
  address: string;
  pipeline: string;
  department: string;
  purpose: string;
  hostName: string;
  hostDept: string;
  escortName: string;
  escortPhone: string;
  requestDate: string;
  status: string;
  organization: string;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded current employee context (Replace with auth later)
  const currentUser = {
    empId: 'EMP001',
    name: 'Sinchana K',
    dept: 'Cyber Security Unit'
  };

  const [currentTab, setCurrentTab] = useState<'All Visitors' | 'Pre-Scheduled' | 'Repeated' | 'Expired'>('All Visitors');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    pipeline: [],
    status: [],
    classification: []
  });

  // UI States
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Fetch Live Data from Supabase
  const fetchMyVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select(`
          visit_id,
          visit_type,
          department,
          purpose,
          status,
          start_date,
          created_at,
          visitors (visitor_id, name, phone, address, email, dob, organization, designation, id_type, id_number, nationality)
        `)
        .eq('host_employee_id', currentUser.empId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const transformed: VisitorRecord[] = data.map((row: any) => {
          let uiPipeline = 'Walk-in';
          if (row.visit_type === 'PRESCHEDULED') uiPipeline = 'Pre-Scheduled';
          if (row.visit_type === 'REPEATED') uiPipeline = 'Repeated';

          // const purposeParts = (row.purpose || '').split('] ');
          // const department = purposeParts.length > 1 ? purposeParts[0].replace('[', '') : 'General Unit';
          // const cleanPurpose = purposeParts.length > 1 ? purposeParts[1] : row.purpose;

          return {
            id: row.visit_id,
            visitorName: row.visitors?.name || 'Unknown',
            phone: row.visitors?.phone || 'N/A',
            email: row.visitors?.email || 'N/A',
            dob: row.visitors?.dob || 'N/A',
            id_type: row.visitors?.id_type || 'Govt ID',
            id_number: row.visitors?.id_number || 'N/A',
            address: row.visitors?.address || 'N/A',
            pipeline: uiPipeline,
            department: row.department || "General Unit",
            purpose: row.purpose || 'General Entry',
            hostName: currentUser.name,
            hostDept: currentUser.dept,
            escortName: 'Not Assigned', // Temporarily hardcoded until we add the DB column
            escortPhone: 'N/A',         // Temporarily hardcoded until we add the DB column
            requestDate: new Date(row.start_date || row.created_at).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            status: row.status === 'Approved' ? 'Cleared' : row.status,
            organization: row.visitors?.organization || 'N/A'
          };
        });
        setShiftData(transformed);
      }
    } catch (err) {
      console.error("Error fetching shift data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVisits();
  }, []);

  const filterBuckets = [
    {
      key: 'pipeline',
      title: 'Visit Type',
      options: [
        { label: 'Walk-in', value: 'Walk-in' },
        { label: 'Pre-Scheduled', value: 'Pre-Scheduled' },
        { label: 'Repeated', value: 'Repeated' },
      ]
    },
    {
      key: 'status',
      title: 'Status',
      options: [
        { label: 'Cleared', value: 'Cleared' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Expired', value: 'Expired' },
      ]
    },
    {
      key: 'department',
      title: 'Department',
      options: [
        { label: 'Research Wing', value: 'Research Wing' },
        { label: 'IT Department', value: 'IT Department' },
        { label: 'Cyber Security Unit', value: 'Cyber Security Unit' },
        { label: 'Logistics Division', value: 'Logistics Division' },
        { label: 'Human Resources', value: 'Human Resources' },
        { label: 'General Unit', value: 'General Unit' },
      ]
    }
  ];

  const visibleRows = useMemo(() => {
    return shiftData.filter(item => {
      if (currentTab === 'Pre-Scheduled' && item.pipeline !== 'Pre-Scheduled') return false;
      if (currentTab === 'Repeated' && item.pipeline !== 'Repeated') return false;
      if (currentTab === 'Expired' && item.status !== 'Expired') return false;

      if (searchTerm) {
        const lowerQuery = searchTerm.toLowerCase();
        if (!item.visitorName.toLowerCase().includes(lowerQuery) && !item.id.toLowerCase().includes(lowerQuery)) return false;
      }

      for (const key of Object.keys(selectedFilters)) {
        const selectedValues = selectedFilters[key];
        if (selectedValues.length > 0 && !selectedValues.includes(item[key as keyof VisitorRecord])) return false;
      }
      return true;
    });
  }, [shiftData, currentTab, searchTerm, selectedFilters]);

  const handleFilterToggle = (bucketKey: string, value: string) => {
    setSelectedFilters(prev => {
      const currentSelection = prev[bucketKey] || [];
      const updatedSelection = currentSelection.includes(value)
        ? currentSelection.filter(item => item !== value)
        : [...currentSelection, value];
      return { ...prev, [bucketKey]: updatedSelection };
    });
  };

  const handleRevoke = async (visitId: string) => {
    if(!window.confirm("Are you sure you want to revoke this pass request?")) return;
    try {
      await supabase.from('visits').delete().eq('visit_id', visitId);
      setShiftData(prev => prev.filter(x => x.id !== visitId));
    } catch (err) {
      console.error("Failed to revoke pass:", err);
    } finally {
      setActiveMenuId(null);
    }
  };

  const handleReRegister = () => {
    setIsDetailDrawerOpen(false);
    // Redirecting to add_visitor with the selected visitor's data in the state payload
    navigate('/emp/add_visitor', { state: { autofill: selectedVisitor } });
  };

  return (
    <DashboardLayout role="emp" userName={currentUser.name}>
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back, {currentUser.name}!</h1>
          <p className="text-sm text-slate-500">Gate 1 Reception • Entry Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Redirects to the separate add_visitor page */}
          <div 
            onClick={() => navigate('/emp/add_visitor')}
            className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group cursor-pointer"
          >
            <div>
              <h3 className="text-lg font-semibold text-blue-400">New Visitor Request</h3>
              <p className="text-sm text-slate-400 mt-2">Create a new gate pass request or pre-schedule an upcoming visit.</p>
              <span className="text-blue-400 text-sm font-medium mt-4 inline-block group-hover:text-blue-500">Open Form →</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border border-blue-100 bg-blue-50 rounded-lg text-blue-600 shrink-0">
              <UserPlus className="w-8 h-8 mb-2" />
              <span className="font-semibold text-sm">Add Visitor</span>
            </div>
          </div>

          <Link to="/emp/dispatchedlogs" className="block">
            <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-xl  hover:shadow-md transition-all group cursor-pointer h-full">
              <div>
                <h3 className="text-lg font-semibold text-amber-400">Pass History Logs</h3>
                <p className="text-sm text-slate-500 mt-2">View previously dispatched passes, expired credentials, and exit logs.</p>
                <span className="text-amber-400 text-sm font-medium mt-4 inline-block group-hover:text-amber-500">View Logs →</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border border-slate-200 bg-amber-50 rounded-lg text-amber-500 shrink-0">
                <FileText className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">View History</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-white flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Active Requests & Shift Log</h3>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              <div className="flex space-x-6 text-sm font-medium">
                {(['All Visitors', 'Pre-Scheduled', 'Repeated', 'Expired'] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setCurrentTab(tab)}
                    className={`pb-2 border-b-2 transition-colors font-semibold ${
                      currentTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <SearchFilterMatrix 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedFilters={selectedFilters}
                onFilterToggle={handleFilterToggle}
                filterBuckets={filterBuckets}
                placeholder="Search name or ID..."
              />
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[200px]">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <p className="text-slate-500 font-medium animate-pulse">Syncing logs...</p>
              </div>
            ) : null}
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">PASS ID</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">VISITOR</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">ORGANIZATION</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">VISIT TYPE</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">DEPARTMENT</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">DATE & TIME</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">STATUS</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {visibleRows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">No records found.</td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-blue-500 font-semibold">{row.id}</td>
                      <td className="px-6 py-3">
                        <div className="font-bold text-slate-800">{row.visitorName}</div>
                        <div className="text-xs text-slate-500">{row.phone}</div>
                        <div className="text-xs text-slate-500">{row.email}</div>

                      </td>
                      <td className="px-6 py-3 text-slate-600 text-xs">{row.organization}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs">{row.pipeline}</td>
                      <td className="px-6 py-3">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold">{row.department}</span>
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-xs">{row.requestDate}</td>
                      <td className="px-6 py-3">
                        {row.status === 'Cleared' && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">Cleared</span>}
                        {row.status === 'Pending' && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">Pending</span>}
                        {row.status === 'Expired' && <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded text-xs font-semibold">Expired</span>}
                        {row.status === 'Denied' && <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">Denied</span>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2 relative">
                          <button 
                            onClick={() => { setSelectedVisitor(row); setIsDetailDrawerOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <div className="relative">
                            <button onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuId === row.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-20 text-left text-sm font-medium">
                                  <button onClick={() => handleRevoke(row.id)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-red-600">Revoke Request</button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- REDESIGNED RIGHT-SIDE SLIDE-OUT DRAWER --- */}
        {isDetailDrawerOpen && selectedVisitor && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDetailDrawerOpen(false)} />
            
            {/* Drawer Panel */}
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Pass Details</h2>
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedVisitor.id}</p>
                </div>
                <button onClick={() => setIsDetailDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                
                {/* 1. Personal Details */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" /> Personal Information
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Full Name</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.visitorName}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Phone</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.phone}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Email</span><span className="col-span-2 font-medium text-slate-900 break-all">{selectedVisitor.email}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Date of Birth</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.dob}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">ID Type</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.id_type}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">ID Number</span><span className="col-span-2 font-medium text-slate-900 font-mono">{selectedVisitor.id_number}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Address</span><span className="col-span-2 font-medium text-slate-900 leading-relaxed">{selectedVisitor.address}</span></div>
                  </div>
                </section>

                {/* 2. Visit Info */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <Building className="w-4 h-4 mr-2 text-blue-600" /> Visit Details
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Organization</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.organization}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Department</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.department}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Type</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.pipeline}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Date</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.requestDate}</span></div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500">Purpose</span>
                      <span className="col-span-2 font-medium text-slate-900 bg-white p-3 border border-slate-200 rounded-lg leading-relaxed shadow-sm">
                        {selectedVisitor.purpose}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 3. Host & Escort */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-blue-600" /> Host & Escort
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Assigned Host</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.hostName}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Escort Name</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.escortName}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Escort Phone</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.escortPhone}</span></div>
                  </div>
                </section>

              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedVisitor.status === 'Cleared' ? 'bg-emerald-100 text-emerald-700' :
                  selectedVisitor.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  Status: {selectedVisitor.status}
                </span>
                
                <button 
                  onClick={handleReRegister}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Re-Register Visitor
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </DashboardLayout>
  );
}