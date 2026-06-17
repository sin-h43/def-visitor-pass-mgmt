// pages/emp/index.tsx
import { UserPlus, FileText } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import type { VisitorRecord, TableColumn } from '../../types/visitor';
import { Link } from 'react-router-dom';

// Mock data representing the visitor logs
const shiftData: VisitorRecord[] = [
  {
    id: 'DEF-1001',
    visitorName: 'John Doe',
    phone: '+91 98765 12345',
    category: 'General',
    purpose: 'Contractor Check-in',
    hostName: 'Amit Sharma',
    requestDate: '09/05/2026 08:45',
    status: 'Cleared'
  },
  {
    id: 'DEF-1002',
    visitorName: 'Jane Smith',
    phone: '+91 99887 66554',
    category: 'General',
    purpose: 'Vendor Delivery',
    hostName: 'Neha Kapoor',
    requestDate: '09/05/2026 09:15',
    status: 'Pending'
  }
];

export default function EmployeeDashboard() {
  // Define how the DataTable should render the employee-specific columns
  const columns: TableColumn<VisitorRecord>[] = [
    { 
      key: 'id', 
      label: 'ID', 
      render: (row) => <span className="text-amber-600 font-medium">{row.id}</span> 
    },
    { 
      key: 'visitorName', 
      label: 'Visitor Name',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.visitorName}</div>
          <div className="text-xs text-slate-500">{row.phone}</div>
        </div>
      )
    },
    { key: 'purpose', label: 'Purpose', render: (row) => <span className="text-slate-600">{row.purpose}</span> },
    { key: 'requestDate', label: 'Request Time', render: (row) => <span className="text-slate-600">{row.requestDate}</span> },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => {
        // Dynamic badge styling based on status
        if (row.status === 'Cleared') return <span className="px-2 py-1 bg-slate-800 text-white text-xs rounded font-medium">Cleared</span>;
        if (row.status === 'Pending') return <span className="px-2 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-xs rounded font-medium">Pending Clearance</span>;
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">{row.status}</span>;
      }
    }
  ];

  return (
    <DashboardLayout role="emp" userName="Employee">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back, Employee!</h1>
          <p className="text-sm text-slate-500">Gate 1 Reception . Core Entry Registration Console</p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Add Visitor Card - Routes to Add Visitor Form instantly */}
          <Link to="/emp/add_visitor" className="block outline-none">
            <div className="flex items-center justify-between p-6 bg-white border border-slate-400/60 rounded-xl hover:border-amber-500 hover:shadow-sm transition-all group cursor-pointer h-full">
              <div className="pr-4">
                <h3 className="text-lg font-semibold text-slate-800">Register New Visitor</h3>
                <p className="text-sm text-slate-500 mt-2">Initiate check-in workflow, capture identification records, and issue temporary gate entry passes.</p>
                <span className="text-amber-500 text-sm font-medium mt-4 inline-block group-hover:underline">Open Registration Form →</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border border-amber-200 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                <UserPlus className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">Add Visitor</span>
              </div>
            </div>
          </Link>

          {/* Dispatched Logs Card - Routes to Audit/Logs instantly */}
          <Link to="/emp/repeated_visitor" className="block outline-none">
            <div className="flex items-center justify-between p-6 bg-white border border-slate-400/60 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all group cursor-pointer h-full">
              <div className="pr-4">
                <h3 className="text-lg font-semibold text-slate-800">Dispatched Pass Log</h3>
                <p className="text-sm text-slate-500 mt-2">Track your locally registered guest entries, monitor pending clearances, and confirm exits.</p>
                <span className="text-blue-500 text-sm font-medium mt-4 inline-block group-hover:underline">View Recent Dispatch →</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border border-blue-200 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                <FileText className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">View Log</span>
              </div>
            </div>
          </Link>

        </div>

        {/* Reusable Data Table Wrapper */}
        <div className="relative">
          {/* Active Session Badge overlay mapped to top right of table header */}
          <div className="absolute top-5 right-5 z-10 hidden sm:block">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
              Active Session
            </span>
          </div>
          
          <DataTable 
            title="Your Shift Activity Log" 
            data={shiftData} 
            columns={columns}
            tabs={['All Visitors', 'Pre-Scheduled', 'Repeated', 'Expired']}
          />
        </div>

      </div>
    </DashboardLayout>
  );
}