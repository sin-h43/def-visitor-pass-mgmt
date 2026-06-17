import { useState } from 'react';
import { X, History, UserCheck, FileText, CheckCircle, RefreshCw, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import type { TableColumn } from '../../types/visitor';

// --- MOCK DATA ---
const repeatedVisitors = [
  { id: 'DEF-H001', name: 'Sinchana K', group: 'Repeated Visitor', status: 'Verified / Active' },
  { id: 'DEF-H002', name: 'Arya K', group: 'Repeated Visitor', status: 'Verified / Active' }
];

const mockLogs = [
  { 
    dispatchId: 'DISPATCH-K9UXQD', 
    date: '16/05/2026 10:00:00 AM', 
    context: 'Quarterly Critical Firmware Audit',
    details: {
      dob: '1996-08-24', phone: '+91 9999999999', email: 'sinchana.k@defence.gov.in',
      clearance: 'Level 3', escorts: 'Security Officer Smith', expiry: '2026-05-28'
    }
  },
  { 
    dispatchId: 'DISPATCH-TRXX9', 
    date: '12/04/2026 02:30:00 PM', 
    context: 'Core Server Room Infrastructure',
    details: {
      dob: '1996-08-24', phone: '+91 9999999999', email: 'sinchana.k@defence.gov.in',
      clearance: 'Level 3', escorts: 'None', expiry: '2026-04-15'
    }
  }
];

export default function RepeatedVisitorPage() {
  // State Management for the Nested UI
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handlers
  const openDrawer = (visitor: any) => {
    setSelectedVisitor(visitor);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedVisitor(null), 300); // Wait for animation
  };

  const openModal = (log: any) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedLog(null), 300);
  };

  // Table Configuration
  const columns: TableColumn<any>[] = [
    { key: 'id', label: 'REGISTRY ID', render: (row) => <span className="font-medium text-slate-600">{row.id}</span> },
    { key: 'name', label: 'VISITOR NAME', render: (row) => <span className="font-bold text-slate-800">{row.name}</span> },
    { key: 'group', label: 'CLASSIFICATION GROUP', render: (row) => <span className="text-slate-600">{row.group}</span> },
    { 
      key: 'status', 
      label: 'SECURITY REGISTRY STATUS', 
      render: (row) => (
        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center w-fit">
          <CheckCircle className="w-3 h-3 mr-1" /> {row.status}
        </span>
      ) 
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button 
          onClick={() => openDrawer(row)}
          className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center"
        >
          View Logs <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      )
    }
  ];

  return (
    <DashboardLayout role="emp" userName="Employee">
      <div className="max-w-6xl mx-auto relative">
        
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Repeated Visitor Registry</h1>
            <p className="text-sm text-slate-500">Frequent clearance credentials management terminal</p>
          </div>
        </div>

        {/* Main Data Table */}
        <DataTable 
          title="Master Registry Profiles" 
          data={repeatedVisitors} 
          columns={columns}
        />

        {/* --- SIDE DRAWER (Step 1) --- */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-40 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={closeDrawer}></div>
            
            {/* Drawer Content */}
            <div className="relative w-[400px] bg-white h-full shadow-2xl border-l border-slate-400/60 flex flex-col animate-slide-in-right">
              <div className="p-5 border-b border-slate-400/60 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center text-lg">
                    <UserCheck className="w-5 h-5 mr-2 text-slate-500" />
                    Visitation Logs
                  </h3>
                  <p className="text-sm text-blue-600 font-medium mt-1">{selectedVisitor?.name}</p>
                </div>
                <button onClick={closeDrawer} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-4 bg-slate-100 p-3 rounded border border-slate-300">
                  Select an archived dispatch token to inspect file profiles and cryptographic logs.
                </p>
                
                <div className="space-y-3">
                  {mockLogs.map((log) => (
                    <div 
                      key={log.dispatchId}
                      onClick={() => openModal(log)}
                      className="p-4 border border-slate-300 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all bg-white group"
                    >
                      <div className="text-xs font-bold text-slate-500 mb-1">DISPATCH ID / DATE</div>
                      <div className="font-semibold text-slate-800 flex justify-between items-center">
                        {log.dispatchId}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                      </div>
                      <div className="text-xs text-slate-500 mb-3">{log.date}</div>
                      
                      <div className="text-xs font-bold text-slate-500 mb-1">LOG CONTEXT</div>
                      <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                        {log.context}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- CENTER MODAL (Step 2) --- */}
        {isModalOpen && selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Darker backdrop for modal focus */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
            
            <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-400/80 flex flex-col overflow-hidden animate-fade-in">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-400/60 bg-slate-800 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Complete Dispatch Ledger Entry</h3>
                  <p className="text-xs text-slate-400 mt-1">Pass ID: {selectedLog.dispatchId} • Expired</p>
                </div>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:bg-slate-700 hover:text-white rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 grid grid-cols-3 gap-6 bg-slate-50 h-[500px] overflow-y-auto">
                
                {/* Left Column: Data */}
                <div className="col-span-2 space-y-6">
                  <div className="grid grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1">HOLDER NAME</span>
                      <span className="font-semibold text-slate-800">{selectedVisitor?.name}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1">DATE OF BIRTH</span>
                      <span className="font-medium text-slate-700">{selectedLog.details.dob}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1">EMAIL ADDRESS</span>
                      <span className="font-medium text-slate-700">{selectedLog.details.email}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1">PHONE NUMBER</span>
                      <span className="font-medium text-slate-700">{selectedLog.details.phone}</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 block mb-2">PURPOSE OF VISIT</span>
                    <p className="text-slate-800 font-medium">{selectedLog.context}</p>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <span className="text-xs font-bold text-slate-400 block mb-2">ESCORTED MANIFEST DETAILS</span>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-700">
                        {selectedLog.details.escorts}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Files & Action */}
                <div className="col-span-1 flex flex-col gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex-1 flex flex-col">
                    <span className="text-xs font-bold text-slate-400 block mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-1" /> Uploaded Verification File
                    </span>
                    <div className="flex-1 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-sm italic">
                      [Document Preview Render Space]
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Action) */}
              <div className="p-5 border-t border-slate-400/60 bg-white flex justify-between items-center">
                <span className="text-sm text-slate-500 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> Identity Verified via Session Data
                </span>
                
                {/* The core functionality trigger */}
                <button 
                  onClick={() => {
                    alert('Routing to Registration form with pre-filled session data...');
                    // In real app: router.push(`/emp/add_visitor?autofill=${selectedVisitor.id}`)
                  }}
                  className="flex items-center px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-Register & Autofill Profile
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
      
      {/* Required custom CSS for the slide/fade animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}} />
    </DashboardLayout>
  );
}