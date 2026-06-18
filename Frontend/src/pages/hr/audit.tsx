// pages/hr/audit.tsx
import { useState } from 'react';
import { ShieldCheck, Eye, FileSpreadsheet } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import DetailDrawer from '../../components/common/DetailDrawer';
import type { TableColumn } from '../../types/visitor';

interface AuditLogRecord {
  id: string;
  actorName: string;
  actorRole: 'HR Admin' | 'Security Officer' | 'Employee' | 'System Automated';
  dob: string;
 phone: string;
 email:string;
  actionPerformed: string;
  targetPassId: string;
  timestamp: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

const mockAuditLogs: AuditLogRecord[] = [
  {
    id: 'AUD-0844',
    actorName: 'Gate Outpost 2 Console',
    actorRole: 'Security Officer',
    dob: 'N/A (Terminal Core)',
    phone: 'Ext: 4012',
    email: 'terminal.gate2@defencepass.local',
    actionPerformed: 'Badge Auth Token Override Issued',
    targetPassId: 'DEF-4091',
    timestamp: '18/06/2026 09:12 AM',
    severity: 'High'
  },
  {
    id: 'AUD-0731',
    actorName: 'System Automated Scheduler',
    actorRole: 'System Automated',
    dob: 'N/A (Automated Engine)',
    phone: 'N/A (Local Host)',
    email: 'cron.daemon@defencepass.local',
    actionPerformed: 'Purged Expired Repeated Manifest Files',
    targetPassId: 'GLOBAL_CRON',
    timestamp: '17/06/2026 11:59 PM',
    severity: 'Low'
  },
  {
    id: 'AUD-0912',
    actorName: 'Sinchana K',
    actorRole: 'HR Admin',
    dob: '07/09/2006', // September 7, 2006
    phone: '+91 94480 12345',
    email: 'sinchana.km@defencepass.gov.in',
    actionPerformed: 'Approved Foreign Track Pass Passport Clear',
    targetPassId: 'DEF-2294',
    timestamp: '18/06/2026 10:45 AM',
    severity: 'Medium'
  },
];

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Trails');
  
  // State for tracking the open drawer record state mapping
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerData, setActiveDrawerData] = useState<any | null>(null);

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    actorRole: ['HR Admin', 'Security Officer', 'Employee', 'System Automated'],
    severity: ['Low', 'Medium', 'High', 'Critical']
  });

  const auditFilterGroups = [
    {
      key: 'actorRole',
      title: 'Actor Assignment Role',
      options: [
        { label: 'HR Administrators', value: 'HR Admin' },
        { label: 'Security Officers', value: 'Security Officer' },
        { label: 'Standard Employees', value: 'Employee' },
        { label: 'System Cron Tasks', value: 'System Automated' }
      ]
    },
    {
      key: 'severity',
      title: 'Security Alert Severity',
      options: [
        { label: 'Low Audits', value: 'Low' },
        { label: 'Medium Footprints', value: 'Medium' },
        { label: 'High Overrides', value: 'High' },
        { label: 'Critical Breaches', value: 'Critical' }
      ]
    }
  ];

  const handleFilterToggle = (groupKey: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[groupKey] || [];
      const updated = current.includes(value) ? current.filter(i => i !== value) : [...current, value];
      return { ...prev, [groupKey]: updated };
    });
  };

  const handleOpenDrawer = (log: AuditLogRecord) => {
    setActiveDrawerData(log);
    setIsDrawerOpen(true);
  };

  const filteredAuditLogs = mockAuditLogs.filter(row => {
    const matchesSearch = 
      row.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.targetPassId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = (selectedFilters.actorRole || []).includes(row.actorRole);
    const matchesSeverity = (selectedFilters.severity || []).includes(row.severity);

    let matchesTab = true;
    if (activeTab === 'Elevated Alerts') matchesTab = row.severity === 'High' || row.severity === 'Critical';

    return matchesSearch && matchesRole && matchesSeverity && matchesTab;
  });

  const columns: TableColumn<AuditLogRecord>[] = [
    { key: 'id', label: 'LOG ID', render: (row) => <span className="font-mono font-bold text-slate-500 text-xs">{row.id}</span> },
    {
      key: 'actorName',
      label: 'OPERATIONAL ACTOR',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{row.actorName}</div>
          <div className="text-[11px] text-slate-400 font-medium">{row.actorRole}</div>
        </div>
      )
    },
    { key: 'actionPerformed', label: 'EVENT DESCRIPTION', render: (row) => <span className="text-xs font-medium text-slate-700">{row.actionPerformed}</span> },
    { key: 'targetPassId', label: 'TARGET REF', render: (row) => <span className="text-blue-600 font-mono font-bold text-xs">{row.targetPassId}</span> },
    { key: 'timestamp', label: 'SYSTEM TIMESTAMP', render: (row) => <span className="text-xs text-slate-500 font-medium">{row.timestamp}</span> },
    {
      key: 'severity',
      label: 'SEVERITY',
      render: (row) => {
        const bg: Record<string, string> = {
          Low: 'bg-slate-100 text-slate-800 border-slate-200',
          Medium: 'bg-blue-100 text-blue-800 border-blue-200',
          High: 'bg-orange-100 text-orange-800 border-orange-200',
          Critical: 'bg-rose-100 text-rose-800 border-rose-200'
        };
        return <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${bg[row.severity]}`}>{row.severity}</span>;
      }
    },
    {
      key: 'id',
      label: 'ACTIONS',
      render: (row) => (
        <button 
          onClick={() => handleOpenDrawer(row)}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
        >
          <Eye className="w-4 h-4" />
          <span>Review</span>
        </button>
      )
    }
  ];

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-7xl mx-auto space-y-6 relative">
        
        {/* Header Block Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">System Compliance Audit Logs</h1>
              <p className="text-sm text-slate-500">Immutable forensic activity tracking and credential modifications manifest.</p>
            </div>
          </div>
          <button 
            onClick={() => alert('Exporting crypto trail ledger...')}
            className="flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 gap-2 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Audit Ledger
          </button>
        </div>

        {/* Master Logging Table Wrapper */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
          
          {/* Decoupled Filter Matrix Toolbar */}
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <SearchFilterBar 
              value={searchTerm}
              onChange={setSearchTerm}
              selectedFilters={selectedFilters}
              onFilterToggle={handleFilterToggle}
              filterGroups={auditFilterGroups}
              placeholder="Search actor name, pass tracking ID, or log reference..."
            />
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="flex border-b border-slate-200 text-xs font-semibold space-x-4">
            {['All Trails', 'Elevated Alerts'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 relative ${activeTab === tab ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table Element Content Box */}
          <div className="overflow-x-auto custom-audit-table-hide-search">
            <style>{`
              .custom-audit-table-hide-search [type="text"], 
              .custom-audit-table-hide-search input[placeholder*="Search"],
              .custom-audit-table-hide-search .flex:has(input[placeholder*="Search"]) {
                display: none !important;
              }
            `}</style>
            <DataTable 
              title="" 
              data={filteredAuditLogs} 
              columns={columns}
              tabs={[]} 
            />
          </div>
        </div>

        {/* REUSABLE LIGHT BACKDROP PROFILE DRAWER COMPONENT TRIGGERED VIA STATE HOOKS */}
        <DetailDrawer 
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Forensic Activity Signature Payload"
          data={activeDrawerData}
        />

      </div>
    </DashboardLayout>
  );
}