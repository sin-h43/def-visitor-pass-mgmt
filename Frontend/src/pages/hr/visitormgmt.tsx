// pages/hr/visitormgmt.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, Landmark, Globe, ShieldAlert, Wrench, Eye, CheckCircle, XCircle, X, Shield, Building, FileText, Check } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { TableColumn } from '../../types/visitor';
import { supabase } from '../../lib/supabase';

// Updated Interface to hold all timing and escort data
interface VisitorRecord {
  id: string;
  visitorName: string;
  gender: string;
  phone: string;
  email: string;
  category: string;
  purpose: string;
  hostName: string;
  hostDept: string;
  hostId:string;
  requestedAt: string; // When the employee submitted it
  visitDate: string;   // When the visitor is arriving
  status: string;
  passType: string;
  pipeline: string;
  nationality: string;
  organization: string;
  documentUrl: string | null;
  escorts: any[];
  dob: string;
  id_type: string;
  id_number: string;
  address: string;
  department: string;
  designation:string;
}

export default function VisitorMgmtPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Visitors');

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    category: [],
    pipeline: [],
    status: []
  });

  const [visitorLogs, setVisitorLogs] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

  const fetchVisitorLogs = async () => {
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
          department,
          visitors (
            visitor_id, name, phone, email, nationality, organization, designation, dob, document_url, gender, address, id_type, id_number
          ),
          escorts(name, phone, id_number, id_type),
          host:employees!visits_host_employee_id_fkey (id,name, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const transformed: VisitorRecord[] = data.map((row: any) => {
          let uiPipeline = 'Walk-in';
          const dbType = row.visit_type?.toLowerCase();
          if (dbType === 'prescheduled' || dbType === 'scheduled') uiPipeline = 'Pre-Scheduled';
          if (dbType === 'repeated') uiPipeline = 'Repeated';

          const computedCategory = row.visitors?.nationality?.toLowerCase() !== 'indian' ? 'Foreign' : 'General';
          const escortsArray = Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []);
          
          return {
            id: row.visit_id, 
            visitorName: row.visitors?.name || 'Unknown',
            gender: row.visitors?.gender || 'Others',
            phone: row.visitors?.phone || 'N/A',
            email: row.visitors?.email || 'N/A',
            category: computedCategory, 
            purpose: row.purpose || 'General Entry',

            //host details
            hostName: row.host?.name || 'Unassigned',
            hostDept: row.host?.role === 'hr' ? 'HR Officer' : 'Staff Member',
            hostId: row.host?.id || 'N/A',
            
            
            // Format precise dates
            requestedAt: new Date(row.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            visitDate: row.start_date ? new Date(row.start_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
            
            status: row.status,
            passType: row.pass_type || 'ONE_DAY',
            pipeline: uiPipeline,
            nationality: row.visitors?.nationality || 'Indian',
            organization: row.visitors?.organization || 'N/A',
            designation:row.visitors?.desiganization || 'N/A',
            documentUrl: row.visitors?.document_url || row.document_url || null,
            escorts : escortsArray,
            dob: row.visitors?.dob || 'N/A',
            id_type: row.visitors?.id_type || 'Govt ID',
            id_number: row.visitors?.id_number || 'N/A',
            address: row.visitors?.address || 'N/A',
            department: row.department || 'General Unit'
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

  // Update Status directly from the table or drawer
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('visits').update({ status: newStatus }).eq('visit_id', id);
      if (error) throw error;
      
      // Update local state instantly
      setVisitorLogs(prev => prev.map(log => log.id === id ? { ...log, status: newStatus } : log));
      if (selectedVisitor?.id === id) {
        setSelectedVisitor(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to process status change.");
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
      const updated = current.includes(value) 
        ? current.filter(item => item !== value) 
        : [...current, value];
      return { ...prev, [groupKey]: updated };
    });
  };

  const matrixFilteredRows = useMemo(() => {
    return visitorLogs.filter(row => {
      const matchesSearch = 
        row.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = (selectedFilters.category.length === 0) || selectedFilters.category.includes(row.category);
      const matchesPipeline = (selectedFilters.pipeline.length === 0) || selectedFilters.pipeline.includes(row.pipeline);
      const matchesStatus = (selectedFilters.status.length === 0) || selectedFilters.status.includes(row.status);

      let matchesTab = true;
      if (activeTab === 'Pre-Scheduled') matchesTab = row.pipeline === 'Pre-Scheduled';
      if (activeTab === 'Repeated') matchesTab = row.pipeline === 'Repeated';
      if (activeTab === 'Expired') matchesTab = row.status === 'Expired';

      return matchesSearch && matchesCategory && matchesPipeline && matchesStatus && matchesTab;
    });
  }, [visitorLogs, searchTerm, selectedFilters, activeTab]);

  const categories = [
    { type: 'General', label: 'General Pass', desc: 'Standard public walk-ins, temporary business visits, or casual meetings.', icon: User, color: 'border-blue-100 hover:border-blue-300 hover:shadow-blue-50/50 hover:bg-blue-50 ', iconBg: 'bg-blue-50 text-blue-600 hover:bg-white' },
    { type: 'HR', label: 'HR Registry', desc: 'Candidate interviews, employee onboardings, and internal hr syncs.', icon: ShieldAlert, color: 'border-purple-100 hover:border-purple-300 hover:shadow-purple-50/50 hover:bg-purple-50', iconBg: 'bg-purple-50 text-purple-600' },
    { type: 'Govt', label: 'Govt / Defense', desc: 'High-security clearance pathways for officials and ministry personnel.', icon: Landmark, color: 'border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-50/50 hover:bg-emerald-50', iconBg: 'bg-emerald-50 text-emerald-600' },
    { type: 'Foreign', label: 'Foreign National', desc: 'International delegates, international passports, embassy tracks.', icon: Globe, color: 'border-amber-100 hover:border-amber-300 hover:shadow-amber-50/50 hover:bg-amber-50', iconBg: 'bg-amber-50 text-amber-600' },
    { type: 'Service', label: 'Service / Vendor', desc: 'Maintenance, infrastructure crews, and outsourced service tokens.', icon: Wrench, color: 'border-orange-100 hover:border-orange-300 hover:shadow-orange-50/50 hover:bg-orange-50/50', iconBg: 'bg-orange-50 text-orange-600' },
  ];

  // SUPERCHARGED COLUMNS FOR HR
  const columns: TableColumn<VisitorRecord>[] = [
      {
      key: 'hostName',
      label: 'HOST DETAILS',
      render: (row) => (
        <div>
          <div className="text-slate-800 font-medium text-xs">{row.hostName}</div>
          <div className="text-xs text-slate-500">{row.hostDept}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{row.hostId}</div>

        </div>
      )
    },
    { key: 'id', label: 'PASS ID', render: (row) => <span className="text-blue-500 font-mono font-semibold ">{row.id}</span> },
    {
      key: 'visitorName',
      label: 'VISITOR DETAILS',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800 text-sm">{row.visitorName}</div>
          <div className="text-xs text-slate-500">{row.phone}</div>
          <div className="text-xs text-slate-500">{row.email}</div>
        </div>
      )
    },
    {
      key: 'timing',
      label: 'REQUEST & ENTRY TIMING',
      render: (row) => (
        <div>
          <div className="text-[11px] text-slate-500 mb-0.5"><span className="font-semibold text-slate-700">Req:</span> {row.requestedAt}</div>
          <div className="text-[11px] text-slate-500"><span className="font-semibold text-blue-600">Entry:</span> {row.visitDate}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY',
      render: (row) => {
        if (row.category === 'General') return <span className="font-semibold text-blue-600 text-sm">General Pass</span>;
        if (row.category === 'HR') return <span className="font-semibold text-purple-600 text-sm">HR Registry</span>;
        if (row.category === 'Govt') return <span className="font-semibold text-emerald-600 text-sm">Govt/Defence</span>;
        if (row.category === 'Foreign') return <span className="font-semibold text-amber-600 text-sm">Foreign National</span>;
        if (row.category === 'Service') return <span className="font-semibold text-orange-600 text-sm">Service</span>;
      }
    },
    {
      key: 'department',
      label: 'DEPARTMENT',
      render: (row) => {
        if (row.department === 'Research Wing') return <span className="font-semibold text-slate-800 text-sm">Research Wing</span>;
        if (row.department === 'IT Department') return <span className="font-semibold text-slate-800 text-sm">IT Department</span>;
        if (row.department === 'Cyber Security Unit') return <span className="font-semibold text-slate-800 text-sm">Cyber Security Unit</span>;
        if (row.department === 'Logistics Division') return <span className="font-semibold text-slate-800 text-sm">Logistics Division</span>;
        if (row.department === 'Human Resources') return <span className="font-semibold text-slate-800 text-sm">Human Resources</span>;
        if (row.department=== 'General Unit') return <span className="font-semibold text-slate-800 text-sm">General Unit</span>;
        // return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider rounded font-bold">{row.status}</span>;
      }
    },
    {
      key: 'purpose',
      label: 'PURPOSE',
      render: (row) => (
          <div className="text-semibold text-slate-800">{row.purpose}</div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => {
        if (row.status === 'Approved') return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wider rounded font-bold">Approved</span>;
        if (row.status === 'Pending') return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 text-[10px] uppercase tracking-wider rounded font-bold animate-pulse">Action Req</span>;
        if (row.status === 'Denied') return <span className="px-2 py-1 bg-red-100 text-red-800 border border-red-200 text-[10px] uppercase tracking-wider rounded font-bold">Denied</span>;
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider rounded font-bold">{row.status}</span>;
      }
    },
    
    {
      key: 'actions',
      label: 'ACTIONS',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          {row.status === 'Pending' && (
            <>
              <button onClick={() => handleUpdateStatus(row.id, 'Approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors" title="Approve Request">
                <CheckCircle className="w-5 h-5" />
              </button>
              <button onClick={() => handleUpdateStatus(row.id, 'Denied')} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Decline Request">
                <XCircle className="w-5 h-5" />
              </button>
            </>
          )}
          <button 
            onClick={() => { setSelectedVisitor(row); setIsDrawerOpen(true); }} 
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors ml-2" 
            title="Review Full Details"
          >
            <Eye className="w-5 h-5" />
          </button>
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
            <p className="text-slate-500 font-medium">Syncing Master Security Manifest...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Visitor Clearance Management</h1>
            <p className="text-sm text-slate-500">Review pending requests and manage facility access approvals.</p>
          </div>
        </div>

        {/* Quick Add Categories */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SELECT VISITOR CATEGORY</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select the most appropriate category to manually register a walk-in.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.type} onClick={() => navigate(`/hr/add_visitor?category=${cat.type.toLowerCase()}`)} className={`group bg-white border rounded-xl p-5 flex flex-col justify-between items-start cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden ${cat.color}`}>
                  <div className="w-full">
                    <div className={`p-2.5 rounded-lg w-fit mb-4 transition-transform group-hover:bg-white duration-200 ${cat.iconBg}`}><Icon className="w-5 h-5" /></div>
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-slate-900">{cat.label}</h4>
                    <p className="text-[11px] leading-relaxed text-slate-400 font-medium mt-1.5 group-hover:text-slate-500 line-clamp-2">{cat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Master Log Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Master Security Manifest Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">Historical and active verification records registry</p>
          </div>

          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <SearchFilterBar value={searchTerm} onChange={setSearchTerm} selectedFilters={selectedFilters} onFilterToggle={handleFilterToggle} filterGroups={visitorFilterGroups} placeholder="Search by visitor name or Pass ID..." />
          </div>

          <div className="flex border-b border-slate-200 text-xs font-semibold space-x-4">
            {['All Visitors', 'Pre-Scheduled', 'Repeated', 'Expired'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 px-1 relative ${activeTab === tab ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {tab}
              </button>
            ))}
          </div>

          <DataTable data={matrixFilteredRows} columns={columns} />
        </div>

        {/* HR REVIEW SLIDE-OUT DRAWER */}
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
                
                {/* 1. Audit & Timing */}
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

                {/* 2. Personal Details */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" /> Visitor Identity
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Full Name</span><span className="col-span-2 font-bold text-slate-900">{selectedVisitor.visitorName}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Gender</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.gender}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Nationality</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.nationality}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Phone</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.phone}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Email</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.email}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">DOB</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.dob}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">ID Type</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.id_type}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">ID Number</span><span className="col-span-2 font-medium text-slate-900 font-mono tracking-wider">{selectedVisitor.id_number}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Organization</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.organization}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Designation</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.designation}</span></div>
                  </div>
                </section>

                {/* 3. Visit Context */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <Building className="w-4 h-4 mr-2 text-blue-600" /> Purpose of Visit
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Department</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.department}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Pipeline</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.pipeline}</span></div>
                    <div>
                      <span className="text-slate-500 block mb-1">Declared Purpose</span>
                      <div className="bg-white p-3 border border-slate-200 rounded-lg leading-relaxed shadow-sm text-slate-800">
                        {selectedVisitor.purpose}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. Escorts */}
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

                {/* 5. Documents */}
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

              {/* HR ACTION FOOTER */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                  selectedVisitor.status === 'Cleared' ? 'bg-slate-100 text-slate-700' :
                  selectedVisitor.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                  selectedVisitor.status === 'Pending' ? 'bg-amber-100 text-amber-400 animate-pulse' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedVisitor.status}
                </span>

                <div className="flex items-center gap-3">
                  {selectedVisitor.status === 'Pending' && (
                    <>
                      <button onClick={() => { handleUpdateStatus(selectedVisitor.id, 'Denied'); setIsDrawerOpen(false); }} className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-lg transition-colors">
                        Decline
                      </button>
                      <button onClick={() => { handleUpdateStatus(selectedVisitor.id, 'Approved'); setIsDrawerOpen(false); }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                        <Check className="w-4 h-4" /> Approve Entry
                      </button>
                    </>
                  )}
                </div>
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