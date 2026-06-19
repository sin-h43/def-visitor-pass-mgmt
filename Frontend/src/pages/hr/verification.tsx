// pages/hr/verification.tsx
import  { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Eye, ShieldCheck, ClipboardCheck, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import DetailDrawer from '../../components/common/DetailDrawer';
import type { TableColumn, VisitorRecord } from '../../types/visitor';

const baselineVerificationQueue: VisitorRecord[] = [
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
    status: 'Pending',
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
  }
];

export default function VerificationQueuePage() {
  const [dataQueue, setDataQueue] = useState<VisitorRecord[]>(baselineVerificationQueue);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Awaiting Review');

  // Reusable modal view states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerData, setActiveDrawerData] = useState<VisitorRecord | null>(null);

  // Filter state configs mapping
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    category: ['Govt', 'Foreign', 'Service', 'General'],
    pipeline: ['immediate', 'scheduled', 'repeated']
  });

  const verificationFilterGroups = [
    {
      key: 'category',
      title: 'Security Clearance Category',
      options: [
        { label: 'Government / Defence', value: 'Govt' },
        { label: 'Foreign Nationals', value: 'Foreign' },
        { label: 'Service / Contractors', value: 'Service' },
        { label: 'General Vetting', value: 'General' }
      ]
    },
    {
      key: 'pipeline',
      title: 'Arrival Entry Track',
      options: [
        { label: 'Immediate Walk-Ins', value: 'immediate' },
        { label: 'Pre-Scheduled Appts', value: 'scheduled' },
        { label: 'Repeated Framework', value: 'repeated' }
      ]
    }
  ];

  const handleUpdateStatus = (id: string, nextStatus: VisitorRecord['status']) => {
    setDataQueue(prev => prev.map(item => item.id === id ? { ...item, status: nextStatus } : item));
    setIsDrawerOpen(false);
  };

  const handleFilterToggle = (groupKey: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[groupKey] || [];
      const updated = current.includes(value) ? current.filter(i => i !== value) : [...current, value];
      return { ...prev, [groupKey]: updated };
    });
  };

  const handleInspectProfile = (record: VisitorRecord) => {
    setActiveDrawerData(record);
    setIsDrawerOpen(true);
  };

  // Compile internal table rows dynamically against search terms, multi-filters, and queue filter categories
  const processedFilteredQueue = dataQueue.filter(row => {
    const matchesSearch = 
      row.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = (selectedFilters.category || []).includes(row.category);
    const matchesPipeline = (selectedFilters.pipeline || []).includes(row.pipeline);

    let matchesTab = true;
    if (activeTab === 'Awaiting Review') matchesTab = row.status === 'Pending';
    if (activeTab === 'Processed Action Logs') matchesTab = row.status === 'Approved' || row.status === 'Denied';

    return matchesSearch && matchesCategory && matchesPipeline && matchesTab;
  });

  const columns: TableColumn<VisitorRecord>[] = [
    { key: 'id', label: 'PASS ID', render: (row) => <span className="text-blue-600 font-mono font-bold text-xs">{row.id}</span> },
    {
      key: 'visitorName',
      label: 'IDENTITY DETAILS',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800 text-sm">{row.visitorName}</div>
          <div className="text-xs text-slate-400 font-mono font-medium">{row.phone}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'SECURITY CLASS',
      render: (row) => {
        const bg: Record<string, string> = {
          Govt: 'bg-purple-100 text-purple-800 border-purple-200',
          Foreign: 'bg-orange-100 text-orange-800 border-orange-200',
          Service: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          General: 'bg-slate-100 text-slate-800 border-slate-200'
        };
        return <span className={`px-2 py-0.5 text-xs font-bold rounded border ${bg[row.category]}`}>{row.category}</span>;
      }
    },
    { key: 'pipeline', label: 'ENTRY PIPELINE', render: (row) => <span className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-500">{row.pipeline}</span> },
    { key: 'purpose', label: 'OBJECTIVE INTENT', render: (row) => <p className="text-xs text-slate-600 max-w-[150px] truncate" title={row.purpose}>{row.purpose}</p> },
    { key: 'hostName', label: 'SPONSOR TARGET', render: (row) => <span className="text-slate-700 font-bold text-xs">{row.hostName}</span> },
    {
      key: 'status',
      label: 'GATE DECISION',
      render: (row) => {
        if (row.status === 'Pending') return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded font-bold animate-pulse">Awaiting Triaging</span>;
        if (row.status === 'Approved') return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs rounded font-bold">Authorized</span>;
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 text-xs rounded font-bold">Access Revoked</span>;
      }
    },
    {
      key: 'id',
      label: 'QUEUE ACTIONS',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          {row.status === 'Pending' && (
            <>
              <button 
                onClick={() => handleUpdateStatus(row.id, 'Approved')}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition-all bg-white"
                title="Authorize Clearance"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleUpdateStatus(row.id, 'Denied')}
                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-300 transition-all bg-white"
                title="Deny Clearance"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          <button 
            onClick={() => handleInspectProfile(row)}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all bg-white"
            title="Inspect Payload Token"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Dynamic Context Header Summary */}
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
          <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gate Access Verification Queue</h1>
            <p className="text-sm text-slate-500">Live operational auditing interface for vetting inbound biometric registrations.</p>
          </div>
        </div>

        {/* Live Security Queue Snapshot Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Awaiting Screening', value: dataQueue.filter(d => d.status === 'Pending').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { title: 'Authorized Entries', value: dataQueue.filter(d => d.status === 'Approved').length.toString(), icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { title: 'Blacklisted / Rejected', value: dataQueue.filter(d => d.status === 'Denied').length.toString(), icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white border border-slate-300 p-4 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-400 block tracking-wide uppercase">{stat.title}</span>
                <span className="text-2xl font-black text-slate-800 block mt-1">{stat.value}</span>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Dashboard Panel Workspace */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
          
          {/* Isolated Custom SearchFilterBar Configuration placement */}
          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
            <SearchFilterBar 
              value={searchTerm}
              onChange={setSearchTerm}
              selectedFilters={selectedFilters}
              onFilterToggle={handleFilterToggle}
              filterGroups={verificationFilterGroups}
              placeholder="Search active checkpoint entries by name or Pass ID token..."
            />
          </div>

          {/* Core Queue Switching Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-semibold space-x-4">
            {['Awaiting Review', 'Processed Action Logs'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 relative ${activeTab === tab ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Data Grid table container overriding local built-in search boxes */}
          <div className="overflow-x-auto custom-queue-hide-search">
            <style>{`
              .custom-queue-hide-search [type="text"], 
              .custom-queue-hide-search input[placeholder*="Search"],
              .custom-queue-hide-search .flex:has(input[placeholder*="Search"]) {
                display: none !important;
              }
            `}</style>
            <DataTable 
              title="" 
              data={processedFilteredQueue} 
              columns={columns}
              
            />
          </div>
        </div>

        {/* Universal DetailDrawer tracking modal component payload */}
        <DetailDrawer 
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Gate Pass Security Appraisal"
          data={activeDrawerData}
        />

      </div>
    </DashboardLayout>
  );
}