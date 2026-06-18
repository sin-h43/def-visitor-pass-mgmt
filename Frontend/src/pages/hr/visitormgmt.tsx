// pages/hr/visitormgmt.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, Landmark, Globe, ShieldAlert, Wrench } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import type { VisitorRecord, TableColumn } from '../../types/visitor';

const globalVisitorLogs: VisitorRecord[] = [
  {
    id: 'DEF-8821',
    visitorName: 'Rajesh Kumar',
    phone: '+91 98860 12345',
    email: 'rajesh.k@gmail.com',
    category: 'Govt',
    purpose: 'Inter-Departmental Security Audit',
    hostName: 'Nagarjun',
    hostDept: 'Cyber Security Division',
    requestDate: '18/06/2026 10:15 AM',
    status: 'Approved',
    pipeline: 'scheduled'
  },
  {
    id: 'DEF-2294',
    visitorName: 'Sarah Jenkins',
    phone: '+1 555 019 2834',
    email: 's.jenkins@globaltech.com',
    category: 'Foreign',
    purpose: 'Propulsion Systems Briefing',
    hostName: 'Anand M S',
    hostDept: 'Aerospace Engineering',
    requestDate: '18/06/2026 11:30 AM',
    status: 'Pending',
    pipeline: 'immediate'
  },
  {
    id: 'DEF-4091',
    visitorName: 'Madan Gowda',
    phone: '+91 94481 98765',
    category: 'Service',
    purpose: 'HVAC Plant Maintenance',
    hostName: 'Sayona K',
    hostDept: 'Estate & Facilities',
    requestDate: '17/06/2026 04:00 PM',
    status: 'Cleared',
    pipeline: 'repeated'
  }
];

export default function VisitorMgmtPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Visitors');

  // Multi-Feature Filter Categories Matrix for Visitor Management Track
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    category: ['Govt', 'Foreign', 'Service', 'General', 'HR'],
    pipeline: ['immediate', 'scheduled', 'repeated'],
    status: ['Pending', 'Approved', 'Denied', 'Cleared', 'Active']
  });

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

  // Natively compute rows against matrix selections
  const matrixFilteredRows = globalVisitorLogs.filter(row => {
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
    { type: 'General', label: 'General Pass', icon: User, color: 'hover:border-blue-500 hover:text-blue-600 bg-blue-50/30' },
    { type: 'HR', label: 'HR Registry', icon: ShieldAlert, color: 'hover:border-amber-500 hover:text-amber-600 bg-amber-50/30' },
    { type: 'Govt', label: 'Govt / Defense', icon: Landmark, color: 'hover:border-purple-500 hover:text-purple-600 bg-purple-50/30' },
    { type: 'Foreign', label: 'Foreign National', icon: Globe, color: 'hover:border-orange-500 hover:text-orange-600 bg-orange-50/30' },
    { type: 'Service', label: 'Service / Vendor', icon: Wrench, color: 'hover:border-emerald-500 hover:text-emerald-600 bg-emerald-50/30' },
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

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Summary */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Visitor Clearance Management</h1>
            <p className="text-sm text-slate-500">Launch dynamic context-aware credential onboarding tracks</p>
          </div>
        </div>

        {/* Onboarding Context Pathway Row */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Select Onboarding Context Pathway</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div 
                  key={cat.type}
                  onClick={() => navigate(`/hr/add_visitor?category=${cat.type.toLowerCase()}`)}
                  className={`border border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group ${cat.color}`}
                >
                  <Icon className="w-6 h-6 text-slate-400 group-hover:scale-110 transition-transform mb-2" />
                  <span className="text-sm font-bold text-slate-700">{cat.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manifest Panel Container Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Master Security Manifest Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">Historical verification records registry</p>
          </div>

          {/* Integrated Reusable SearchFilterBar */}
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

          {/* Sub-Tab Array Layout */}
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

          {/* Clear layout matching rules */}
          <div className="overflow-x-auto custom-mgmt-table-hide-search">
            <style>{`
              .custom-mgmt-table-hide-search [type="text"], 
              .custom-mgmt-table-hide-search input[placeholder*="Search"],
              .custom-mgmt-table-hide-search .flex:has(input[placeholder*="Search"]) {
                display: none !important;
              }
            `}</style>
            <DataTable 
              title="" 
              data={matrixFilteredRows} 
              columns={columns}
              tabs={[]} 
            />
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}