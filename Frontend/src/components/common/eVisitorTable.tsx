// components/common/eVisitorTable.tsx
import { useState } from 'react';
import { Eye, MoreVertical, Pencil, RefreshCw, X, Shield, User, Building, FileText } from 'lucide-react';

export interface EscortRecord {
  name: string;
  phone: string;
  id_number: string;
  id_type: string;
  email: string;
  gender: string;
}

export interface VisitorRecord {
  id: string;
  id_type: string;
  id_number: string;
  visitorName: string;
  phone: string;
  email: string;
  dob: string;
  address: string;
  gender?: string;
  pipeline: string;
  department: string;
  purpose: string;
  hostName: string;
  hostDept: string;
  escorts: EscortRecord[];
  requestDate: string;
  status: string;
  organization: string;
  documentUrl: string | null;
  hr_remarks?: string;
  created_at?: string;
  nationality?: string;
  designation?: string;
}

interface VisitorTableProps {
  data: VisitorRecord[];
  loading: boolean;
  onEdit: (visitor: VisitorRecord) => void;
  onRevoke: (id: string) => void;
  onReRegister: (visitor: VisitorRecord) => void;
  onView?: (visitor: VisitorRecord) => void;
}


export default function VisitorTable({ 
  data, 
  loading, 
  onEdit, 
  onRevoke, 
  onReRegister 
}: VisitorTableProps) {
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleOpenDrawer = (visitor: VisitorRecord) => {
    setSelectedVisitor(visitor);
    setIsDetailDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDetailDrawerOpen(false);
    setTimeout(() => setSelectedVisitor(null), 300);
  };

  return (
    <>
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
            {data.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">No records found.</td>
              </tr>
            ) : (
              data.map((row) => (
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
                    {row.status === 'Revoked' && <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded text-xs font-semibold">Revoked</span>}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2 relative">
                      <button 
                        onClick={() => handleOpenDrawer(row)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <div className="relative">
                        <button onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors focus:outline-none">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeMenuId === row.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-20 text-left text-sm font-medium origin-top-right">
                              {row.status === 'Pending' && (
                                <button onClick={() => { setActiveMenuId(null); onEdit(row); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 transition-colors block">Edit Request</button>
                              )}
                              {row.status !== 'Revoked' && (
                                <button onClick={() => { setActiveMenuId(null); onRevoke(row.id); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 border-t border-slate-100 transition-colors block">Revoke Pass</button>
                              )}
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

      {/* RIGHT-SIDE SLIDE-OUT DRAWER */}
      {isDetailDrawerOpen && selectedVisitor && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={handleCloseDrawer} />
          
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Pass Details</h2>
                <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedVisitor.id}</p>
              </div>
              <button onClick={handleCloseDrawer} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-500" /> Personal Information
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Full Name</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.visitorName}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Gender</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.gender || 'N/A'}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Phone</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.phone}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Email</span><span className="col-span-2 font-medium text-slate-900 break-all">{selectedVisitor.email}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Date of Birth</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.dob}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">ID Type</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.id_type}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">ID Number</span><span className="col-span-2 font-medium text-slate-900 font-mono">{selectedVisitor.id_number}</span></div>
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Address</span><span className="col-span-2 font-medium text-slate-900 leading-relaxed">{selectedVisitor.address}</span></div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <Building className="w-4 h-4 mr-2 text-blue-500" /> Visit Details
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

              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-blue-500" /> Host & Escorts
                </h3>
                <div className="space-y-4 text-sm mb-4">
                  <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Assigned Host</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.hostName}</span></div>
                </div>

                {selectedVisitor.escorts && selectedVisitor.escorts.length > 0 ? (
                  <div className="space-y-4 mt-4">
                    {selectedVisitor.escorts.map((escort, idx) => (
                      <div key={idx} className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm text-sm">
                        <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Escort {idx + 1}</div>
                        <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500">Name</span><span className="col-span-2 font-medium text-slate-900">{escort.name || 'N/A'}</span></div>
                        <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500">Gender</span><span className="col-span-2 font-medium text-slate-900">{escort.gender || 'N/A'}</span></div>
                        <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500">Email</span><span className="col-span-2 font-medium text-slate-900 break-all">{escort.email || 'N/A'}</span></div>
                        <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500">Phone</span><span className="col-span-2 font-medium text-slate-900">{escort.phone || 'N/A'}</span></div>
                        <div className="grid grid-cols-3 gap-1"><span className="text-slate-500">{escort.id_type || 'ID'}</span><span className="col-span-2 font-medium text-slate-900 font-mono">{escort.id_number || 'N/A'}</span></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">No escorts assigned.</div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" /> Attached Documents
                </h3>
                
                {selectedVisitor.documentUrl ? (
                  <a 
                    href={selectedVisitor.documentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col items-center justify-center text-center hover:bg-blue-100 transition-colors group cursor-pointer"
                  >
                    <FileText className="w-8 h-8 mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-blue-700 text-xs break-all">View clearance_document</span>
                    <span className="text-[10px] text-blue-500 mt-1">Opens in secure viewer</span>
                  </a>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xl flex flex-col items-center justify-center text-center text-slate-400 min-h-[120px]">
                    <FileText className="w-8 h-8 mb-2 text-slate-300" />
                    <span className="text-xs font-medium">No documents attached</span>
                  </div>
                )}
              </section>
            </div>

            {/* DRAWER FOOTER */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col gap-4">
              
              {selectedVisitor.hr_remarks ? (
                <div className="w-full">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">HOD Review Note</span>
                  <div className="bg-white p-3 border border-slate-200 rounded-lg text-sm text-slate-700 italic shadow-sm">
                    "{selectedVisitor.hr_remarks}"
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">HOD Review Note</span>
                  <div className="text-xs text-slate-400 italic">No notes provided.</div>
                </div>
              )}

              <div className="flex items-center justify-between w-full pt-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedVisitor.status === 'Cleared' ? 'bg-emerald-100 text-emerald-700' :
                  selectedVisitor.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                  selectedVisitor.status === 'Revoked' ? 'bg-slate-200 text-slate-600 border border-slate-300' : 'bg-red-100 text-red-700'
                }`}>
                  Status: {selectedVisitor.status}
                </span>

                <div className="flex items-center gap-2">
                  {selectedVisitor.status === 'Pending' ? (
                    <>
                      <button 
                        onClick={() => { handleCloseDrawer(); onRevoke(selectedVisitor.id); }}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium text-sm rounded-lg transition-colors shadow-sm"
                      >
                        Revoke
                      </button>
                      <button 
                        onClick={() => { handleCloseDrawer(); onEdit(selectedVisitor); }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => { handleCloseDrawer(); onReRegister(selectedVisitor); }}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <RefreshCw className="w-4 h-4" /> Re-Register
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </>
  );
}
