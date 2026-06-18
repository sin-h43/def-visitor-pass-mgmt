// pages/hr/index.tsx
import { Link } from 'react-router-dom';
import { Users, Clock, XCircle, ShieldCheck, UserPlus, History, Shield, Bell } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import type { VisitorRecord, TableColumn } from '../../types/visitor';

// Mock data representing global incoming logs for the HR overview
const hrDashboardData: VisitorRecord[] = [
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

export default function HRDashboard() {
  // Column schema tailored for HR eyes (includes Host Name)
  const columns: TableColumn<VisitorRecord>[] = [
    { 
      key: 'id', 
      label: 'PASS ID', 
      render: (row) => <span className="text-blue-600 font-mono font-medium">{row.id}</span> 
    },
    { 
      key: 'visitorName', 
      label: 'VISITOR DETAILS',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.visitorName}</div>
          <div className="text-xs text-slate-500">{row.phone}</div>
        </div>
      )
    },
    { 
      key: 'category', 
      label: 'CATEGORY', 
      render: (row) => {
        const colors: Record<string, string> = {
          Govt: 'bg-purple-100 text-purple-800 border-purple-200',
          Foreign: 'bg-orange-100 text-orange-800 border-orange-200',
          General: 'bg-slate-100 text-slate-800 border-slate-200'
        };
        return (
          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[row.category] || 'bg-slate-100'}`}>
            {row.category}
          </span>
        );
      }
    },
    { key: 'hostName', label: 'ASSIGNED HOST', render: (row) => <span className="text-slate-700 font-medium">{row.hostName}</span> },
    { 
      key: 'status', 
      label: 'STATUS',
      render: (row) => {
        if (row.status === 'Active') return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs rounded font-medium">Active Inside</span>;
        if (row.status === 'Pending') return <span className="px-2 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-xs rounded font-medium">HR Review Required</span>;
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">{row.status}</span>;
      }
    }
  ];

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Metric Cards Row (Takes up 60% equivalent visual weight on top if grid aligned) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Requests', value: '1,248', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { title: 'Pending Clearance', value: '14', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { title: 'Denied Access', value: '32', icon: XCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
            { title: 'Active On-Site', value: '87', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-5 border border-slate-400/60 rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} border ${stat.border}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* 60/40 Main Dynamic Layout Section */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* Left Column (60% equivalent space) -> Global System View Table */}
          <div className="lg:col-span-6 space-y-4">
            <DataTable 
              title="Centralized Access Management Queue" 
              data={hrDashboardData} 
              columns={columns}
              tabs={['All Requests', 'Pending Verification', 'Active Passes']}
            />
          </div>

          {/* Right Column (40% equivalent space) -> Quick Actions & Live Notifications */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Action Box */}
            <div className="bg-white border border-slate-400/80 rounded-xl p-5 shadow-sm">
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
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-purple-500 hover:bg-slate-50/50 transition-all cursor-pointer group">
                  <div className="flex items-center text-sm font-medium text-slate-700">
                    <Shield className="w-4 h-4 mr-3 text-slate-400 group-hover:text-purple-500" />
                    Gate Security Sync Console
                  </div>
                  <span className="text-xs text-slate-400">Link 🟢</span>
                </div>
              </div>
            </div>

            {/* Notification Panel */}
            <div className="bg-white border border-slate-400/80 rounded-xl p-5 shadow-sm flex flex-col h-[320px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center">
                  <Bell className="w-4 h-4 mr-2 text-slate-500" />
                  Live Activity Broadcast
                </h3>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              </div>
              
            </div>

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}