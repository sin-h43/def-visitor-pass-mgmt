// components/common/DetailDrawer.tsx
import { X, FileText, CheckCircle, RefreshCw } from 'lucide-react';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  data: {
    id: string;
    visitorName: string;
    phone: string;
    email?: string;
    purpose: string;
    hostName: string;
    hostDept?: string;
    pipeline :string;
    [key: string]: any; // Allows flexibility for extra backend data variables
  } | null;
  onAutofill?: (name: string) => void;
}

export default function DetailDrawer({ isOpen, onClose, title = "Access Registry Profile", data, onAutofill }: DetailDrawerProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Soft structural light tint backdrop screen */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose}></div>
      
      {/* Central Interactive Panel Sheet */}
      <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-400/80 flex flex-col overflow-hidden animate-fade-in">
        
        {/* Header Ribbon Layout */}
        <div className="p-5 border-b border-slate-400/60 bg-slate-50 text-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Pass ID Reference: <span className="text-blue-600 font-semibold">{data.id}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Double-Column Identity View Dashboard Shell */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
          
          {/* Left Block: Identity Card Data Clusters (Spans 2 columns) */}
          <div className="md:col-span-2 space-y-6">
            {/* Demographics Card */}
            <div className="grid grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-400/60 shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">VISITOR IDENTIFICATION</span>
                <span className="font-bold text-slate-800 text-base">{data.visitorName}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">PHONE CONTACT</span>
                <span className="font-medium text-slate-700">{data.phone}</span>
              </div>
              <div className="mt-2 col-span-2">
                <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">SECURE DIGEST EMAIL</span>
                <span className="font-medium text-slate-700 text-sm break-all">{data.email || 'N/A'}</span>
              </div>
            </div>

            {/* Verification Context Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-400/60 shadow-xs">
              <span className="text-xs font-bold text-slate-400 block mb-1 tracking-wider">VISITATION ENTRY LOG LOGIC</span>
              <p className="text-slate-800 font-medium text-sm bg-slate-50 p-3 border border-slate-200 rounded-lg">
                {data.purpose}
              </p>
              
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

          {/* Right Block: Secure Document Token Attachments */}
          <div className="md:col-span-1 flex flex-col">
            <div className="bg-white p-4 rounded-xl border border-slate-400/60 shadow-xs flex-1 flex flex-col min-h-[200px]">
              <span className="text-xs font-bold text-slate-400 block mb-3 flex items-center tracking-wider">
                <FileText className="w-4 h-4 mr-1 text-slate-400" /> ATTACHED PASS CREDENTIAL
              </span>
              <div className="flex-1 bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 p-4 text-center border-dashed">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center mb-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <span className="font-semibold text-slate-600 text-xs break-all">encrypted_identity_token.pdf</span>
                <span className="text-[10px] text-slate-400 mt-1">Classification Secure View</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Flow Action Footer */}
        <div className="p-4 border-t border-slate-400/60 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-slate-500 flex items-center font-medium">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> Base token logging complete. Integrity check verified.
          </span>
          
          {onAutofill && (
            <button 
              onClick={() => {
                onClose();
                onAutofill(data.visitorName);
              }}
              className="w-full sm:w-auto flex items-center justify-center px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-lg transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Re-Register & Autofill Profile
            </button>
          )}
        </div>

      </div>

      {/* Embedded Animation Frame Rules */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}