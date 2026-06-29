// components/common/DetailDrawer.tsx
import { X, FileText, CheckCircle, Activity, ShieldAlert, Cpu, User, Shield, Calendar, Globe, Target } from 'lucide-react';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  data: any | null; 
  onAutofill?: (name: string) => void;
}

export default function DetailDrawer({ isOpen, onClose, title = "Access Registry Profile", data, onAutofill }: DetailDrawerProps) {
  if (!isOpen || !data) return null;

  // Accurately check if it's an audit log trace vs a standard visitor pass record
  const isAuditLog = !!data.actionPerformed || data.id.startsWith('AUD-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Light tint backdrop overlay screen */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose}></div>
      
      {/* Central Interactive Panel Card Sheet */}
      <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-fade-in">
        
        {/* Header Ribbon Layout */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 text-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {isAuditLog ? (
              <div className="p-2 bg-slate-800 text-white rounded-lg"><Activity className="w-5 h-5" /></div>
            ) : (
              <div className="p-2 bg-blue-600 text-white rounded-lg"><FileText className="w-5 h-5" /></div>
            )}
            <div>
              <h3 className="font-bold text-lg text-slate-900">{isAuditLog ? "Forensic Activity Signature Payload" : title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                System Token ID Reference: <span className="text-blue-600 font-mono font-bold">{data.id}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Body Layout */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30 max-h-[70vh] overflow-y-auto">
          
          <div className="md:col-span-2 space-y-4">
            {isAuditLog ? (
              <div className="space-y-4">
                
                {/* Section 1: Core Operator Demographics Info */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Core Actor Profile Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-0.5">Operator Legal Name</span>
                      <span className="font-bold text-slate-800 text-base">{data.actorName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Assigned Security Role</span>
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">{data.actorRole}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-0.5">Date of Birth (DOB)</span>
                      <span className="font-semibold text-slate-700">{data.dob || 'N/A (System Tier)'}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-0.5">Contact Connection Phone</span>
                      <span className="font-semibold text-slate-700">{data.phone || 'N/A'}</span>
                    </div>
                    <div className="col-span-2 pt-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-0.5">Secure ID Mail Address</span>
                      <span className="font-mono text-slate-700 break-all">{data.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Forensic Operational Tracking Metadata */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> Forensic Network Payload
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-0.5">Machine IP Address</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{data.ipAddress}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-0.5">Target Resource Ref</span>
                      <span className="font-mono font-bold text-blue-600 text-sm">{data.targetPassId}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1.5 tracking-wider uppercase">Executed Transaction Statement</span>
                    <p className="text-slate-700 font-mono text-xs bg-slate-50 p-3.5 border border-slate-200 rounded-lg leading-relaxed font-semibold">
                      {data.actionPerformed}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              /* ========================================================
                  CLASSIC VISITOR PASS PREVIEW TRACK
                 ======================================================== */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">VISITOR IDENTIFICATION</span>
                    <span className="font-bold text-slate-800 text-base">{data.visitorName}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">PHONE CONTACT</span>
                    <span className="font-medium text-slate-700">{data.phone}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">{data.id_type}</span>
                    <span className="font-medium text-slate-700">{data.id_number}</span>
                  </div>
                  <div className="mt-2 col-span-2">
                    <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">SECURE DIGEST EMAIL</span>
                    <span className="font-medium text-slate-700 text-sm break-all">{data.email || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">VISITATION ENTRY LOG LOGIC</span>
                  <p className="text-slate-800 font-medium text-sm bg-slate-50 p-3 border border-slate-200 rounded-lg">{data.purpose}</p>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">DESIGNATED HOST</span>
                      <span className="text-sm font-semibold text-slate-800">{data.hostName}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">HOST DEPARTMENT</span>
                      <span className="text-sm font-semibold text-slate-800">{data.hostDept || 'General Unit'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Status / Severity Block Card Component */}
          <div className="md:col-span-1 flex flex-col">
            <div>
              
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-2 tracking-wider uppercase">Incident Metric</span>
                <div className={`p-3 rounded-lg border text-center font-extrabold text-xs uppercase tracking-wider ${
                  data.severity === 'Critical' || data.severity === 'High' 
                    ? 'bg-rose-50 border-rose-200 text-rose-800' 
                    : data.severity === 'Medium' ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  {data.severity || 'Normal'} Severity Level
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 text-center">
                <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Ledger Sign Type</span>
                <span className="text-xs font-bold text-slate-700">Cryptographic Trail</span>
              </div>
            </div>
          </div>

        </div>

        {/* Info ribbon footer section layout alignment */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-slate-500 flex items-center font-semibold">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> 
            Forensic transaction registry timestamp: {data.timestamp || data.pipeline}
          </span>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}