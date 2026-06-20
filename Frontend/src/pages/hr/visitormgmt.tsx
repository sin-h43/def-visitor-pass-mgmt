// pages/hr/visitormgmt.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, Landmark, Globe, ShieldAlert, Wrench } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { VisitorRecord, TableColumn } from '../../types/visitor';
import { supabase } from '../../lib/supabase';

export default function VisitorMgmtPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Visitors');

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    category: ['Govt', 'Foreign', 'Service', 'General', 'HR'],
    pipeline: ['immediate', 'scheduled', 'repeated'],
    status: ['Pending', 'Approved', 'Denied', 'Cleared', 'Active']
  });

  const [visitorLogs, setVisitorLogs] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
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
              role
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

          setVisitorLogs(transformed);
        }
      } catch (error) {
        console.error('Error hydrating visitor management registry:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVisitorLogs();
  }, []);

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
        { label: 'Immediate Access', value: 'immediate' },
        { label: 'Pre-Scheduled', value: 'scheduled' },
        { label: 'Repeated Framework', value: 'repeated' }
      ]
    },
    {
      key: 'status',
      title: 'Clearance Status',
      options: [
        { label: 'Pending Review', value: 'Pending' },
        { label: 'Approved Access', value: 'Approved' },
        { label: 'Denied Entries', value: 'Denied' },
        { label: 'Cleared Outposts', value: 'Cleared' }
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

  const matrixFilteredRows = visitorLogs.filter(row => {
    const matchesSearch = 
      row.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = (selectedFilters.category || []).includes(row.category);
    const matchesPipeline = (selectedFilters.pipeline || []).includes(row.pipeline);
    const matchesStatus = (selectedFilters.status || []).includes(row.status);

    let matchesTab = true;
    if (activeTab === 'Pre-Scheduled') matchesTab = row.pipeline === 'scheduled';
    if (activeTab === 'Repeated') matchesTab = row.pipeline === 'repeated';

    return matchesSearch && matchesCategory && matchesPipeline && matchesStatus && matchesTab;
  });

  const categories = [
  { 
    type: 'General', 
    label: 'General Pass', 
    desc: 'Standard public walk-ins, temporary business visits, or casual meetings.',
    icon: User, 
    color: 'border-blue-100 hover:border-blue-300 hover:shadow-blue-50/50 hover:bg-blue-50 ',
    iconBg: 'bg-blue-50 text-blue-600 hover:bg-white',
    title: "text-blue-400 "
  },
  { 
    type: 'HR', 
    label: 'HR Registry', 
    desc: 'Candidate interviews, employee onboardings, and internal hr syncs.',
    icon: ShieldAlert,
    color: 'border-purple-100 hover:border-purple-300 hover:shadow-purple-50/50 hover:bg-purple-50',
    iconBg: 'bg-purple-50 text-purple-600'
  },
  { 
    type: 'Govt', 
    label: 'Govt / Defense', 
    desc: 'High-security clearance pathways for officials and ministry personnel.',
    icon: Landmark, 
    color: 'border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-50/50 hover:bg-emerald-50',
    iconBg: 'bg-emerald-50 text-emerald-600'

  },
  { 
    type: 'Foreign', 
    label: 'Foreign National', 
    desc: 'International delegates, international passports, embassy tracks.',
    icon: Globe, 
    color: 'border-amber-100 hover:border-amber-300 hover:shadow-amber-50/50 hover:bg-amber-50',
    iconBg: 'bg-amber-50 text-amber-600'

  },
  { 
    type: 'Service', 
    label: 'Service / Vendor', 
    desc: 'Maintenance, infrastructure crews, and outsourced service tokens.',
    icon: Wrench, 
    color: 'border-orange-100 hover:border-orange-300 hover:shadow-orange-50/50 hover:bg-orange-50/50',
    iconBg: 'bg-orange-50 text-orange-600'

  },
];

  const columns: TableColumn<VisitorRecord>[] = [
    { key: 'id', label: 'PASS ID', render: (row) => <span className="text-slate-800 font-mono font-semibold text-xs">{row.id}</span> },
    {
      key: 'visitorName',
      label: 'VISITOR DETAILS',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800 text-sm">{row.visitorName}</div>
          <div className="text-xs text-slate-500">{row.phone}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY GROUP',
      render: (row) => {
        const badgeStyles: Record<string, string> = {
          General: 'bg-blue-50 text-blue-700 border-blue-200',
          HR: 'bg-amber-50 text-amber-700 border-amber-200',
          Govt: 'bg-purple-50 text-purple-700 border-purple-200',
          Foreign: 'bg-orange-50 text-orange-700 border-orange-200',
          Service: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
        return <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${badgeStyles[row.category] || 'bg-slate-50'}`}>{row.category}</span>;
      }
    },
    { key: 'pipeline', label: 'PIPELINE', render: (row) => <span className="text-xs font-medium uppercase tracking-wider text-slate-500 font-mono">{row.pipeline}</span> },
    {
      key: 'hostName',
      label: 'ASSIGNED SPONSOR',
      render: (row) => (
        <div>
          <div className="text-slate-700 font-medium text-xs">{row.hostName}</div>
          {row.hostDept && <div className="text-[11px] text-slate-400">{row.hostDept}</div>}
        </div>
      )
    },
    {
      key: 'nationality',
      label: 'NATIONALITY',
      render: (row) => (
        <span className="text-xs font-medium text-slate-600 font-mono tracking-wide bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.nationality || 'Indian'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'CLEARANCE STATUS',
      render: (row) => {
        if (row.status === 'Approved') return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded font-bold">Approved</span>;
        if (row.status === 'Pending') return <span className="px-2 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-xs rounded font-bold">Pending Review</span>;
        if (row.status === 'Cleared') return <span className="px-2 py-1 bg-slate-800 text-white text-xs rounded font-medium">Cleared Exit</span>;
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-medium">{row.status}</span>;
      }
    }
  ];

  // 1. The layout to show while fetching data
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

  // 2. The main layout that renders safely AFTER data is loaded
  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Visitor Clearance Management</h1>
            <p className="text-sm text-slate-500">Launch dynamic context-aware credential onboarding tracks</p>
          </div>
        </div>

<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
  <div className="mb-5">
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
      SELECT VISITOR CATEGORY
    </h3>
    <p className="text-xs text-slate-500 mt-0.5">
      Select the most appropriate category for your visitor.
    </p>
  </div>

  {/* Cleaned Layout Grid (No top-border on hover) */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    {categories.map((cat) => {
      const Icon = cat.icon;
      return (
        <div 
          key={cat.type}
          onClick={() => navigate(`/hr/add_visitor?category=${cat.type.toLowerCase()}`)}
          className={`group bg-white border rounded-xl p-5 flex flex-col justify-between items-start cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden ${cat.color}`}
        >
          <div className="w-full">
            {/* Soft background icon container */}
            <div className={`p-2.5 rounded-lg w-fit mb-4 transition-transform group-hover:bg-white duration-200 ${cat.iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Title */}
            <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-slate-900">
              {cat.label}
            </h4>

            {/* Functional context description */}
            <p className="text-[11px] leading-relaxed text-slate-400 font-medium mt-1.5 group-hover:text-slate-500 line-clamp-2">
              {cat.desc}
            </p>
          </div>

          {/* Action indicator row */}
          <div className="mt-5 w-full flex items-center justify-between pt-3 border-t border-slate-50 group-hover:border-slate-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
              Launch Track
            </span>
            <svg 
              className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      );
    })}
  </div>
</div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Master Security Manifest Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">Historical verification records registry</p>
          </div>

          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <SearchFilterBar 
              value={searchTerm}
              onChange={setSearchTerm}
              selectedFilters={selectedFilters}
              onFilterToggle={handleFilterToggle}
              filterGroups={visitorFilterGroups}
              placeholder="Search by visitor name or Pass ID..."
            />
          </div>

          <div className="flex border-b border-slate-200 text-xs font-semibold space-x-4">
            {['All Visitors', 'Pre-Scheduled', 'Repeated', 'Expired'].map(tab => (
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

      </div>
    </DashboardLayout>
  );
}