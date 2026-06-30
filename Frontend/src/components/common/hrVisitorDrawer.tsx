// src/components/common/VisitDetailDrawer.tsx
import { X, User, Users, Shield, Clock, LogIn, LogOut } from 'lucide-react';

interface VisitDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any | null;
}

export default function VisitDetailDrawer({ isOpen, onClose, visit }: VisitDetailDrawerProps) {
  if (!isOpen || !visit) return null;

  // Format dates for the forensic timeline
  const checkInTime = new Date(visit.start_date || visit.created_at).toLocaleString('en-GB', { 
    hour: '2-digit', minute: '2-digit', hour12: true 
  });
  
  // If end_date is identical to start_date (Pending/Active), we mock a "Pending" checkout.
  const isCheckedOut = visit.end_date && visit.end_date !== visit.start_date;
  const checkOutTime = isCheckedOut 
    ? new Date(visit.end_date).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }) 
    : 'Pending Departure';

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Visit Forensic Record</h2>
            <p className="text-xs font-mono text-blue-600 mt-0.5 font-bold">TOKEN: {visit.visit_id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
          
          {/* 1. Security Photo Kiosk Placeholder */}
          <div className="flex flex-col items-center justify-center pb-6 border-b border-slate-100">
            <div className="w-24 h-24 bg-slate-100 rounded-full border-4 border-white shadow-md flex items-center justify-center relative overflow-hidden mb-3">
              <User className="w-10 h-10 text-slate-300" />
              <div className="absolute bottom-0 w-full h-1/3 bg-slate-900/10 flex items-center justify-center">
                <span className="text-[8px] font-bold text-slate-500 uppercase">NO PHOTO</span>
              </div>
            </div>
            <h3 className="font-bold text-slate-900 text-lg">{visit.visitors?.name || 'Unknown'}</h3>
            <span className={`mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
              visit.status === 'Approved' || visit.status === 'Cleared' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
              visit.status === 'Denied' ? 'bg-rose-50 text-rose-600 border-rose-200' :
              'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              Status: {visit.status}
            </span>
          </div>

          {/* 2. Forensic Check-in/Out Timeline */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-600" /> Gate Validation Timeline
            </h3>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-start">
                <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 mr-3 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5 text-slate-400" /> Ingress Authorized
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">{checkInTime} • Authorized Station</div>
                </div>
              </div>
              
              <div className="w-0.5 h-6 bg-slate-200 ml-[3px] my-1" />
              
              <div className="flex items-start">
                <div className={`mt-1 w-2 h-2 rounded-full mr-3 shrink-0 ${isCheckedOut ? 'bg-slate-700' : 'bg-amber-400 animate-pulse'}`} />
                <div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <LogOut className="w-3.5 h-3.5 text-slate-400" /> Egress Validation
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">{checkOutTime}</div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. HR Commentary Block */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-600" /> HR / Security Remarks
            </h3>
            <div className="w-full p-4 border border-slate-200 rounded-xl text-sm bg-blue-50/30 text-slate-700 whitespace-pre-wrap">
              {visit.hr_remarks ? (
                <span className="italic font-medium text-slate-700">"{visit.hr_remarks}"</span>
              ) : (
                <span className="text-slate-400 italic">No operational notes were left for this specific visit.</span>
              )}
            </div>
          </section>

          {/* 4. Escort History Matrix */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center"><Users className="w-4 h-4 mr-2 text-blue-600" /> Escort Manifest</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold border border-slate-200">
                {visit.escorts?.length || 0} Personnel
              </span>
            </h3>
            
            {visit.escorts && visit.escorts.length > 0 ? (
              <div className="space-y-3">
                {visit.escorts.map((escort: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 border border-slate-200 rounded-xl shadow-sm text-sm">
                    <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider border-b border-slate-100 pb-1">Escort {idx + 1}</div>
                    <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500 font-medium">Name</span><span className="col-span-2 font-bold text-slate-800">{escort.name || 'N/A'}</span></div>
                    <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500 font-medium">Gender</span><span className="col-span-2 font-bold text-slate-800">{escort.gender || 'N/A'}</span></div>
                    <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500 font-medium">Nationality</span><span className="col-span-2 font-bold text-slate-800">{escort.nationality || 'N/A'}</span></div>
                    <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500 font-medium">Phone</span><span className="col-span-2 font-medium font-mono text-slate-700">{escort.phone || 'N/A'}</span></div>
                    <div className="grid grid-cols-3 gap-1 mb-1"><span className="text-slate-500 font-medium">Email</span><span className="col-span-2 font-medium text-slate-700 break-all">{escort.email || 'N/A'}</span></div>
                    <div className="grid grid-cols-3 gap-1"><span className="text-slate-500 font-medium">{escort.id_type || 'ID'}</span><span className="col-span-2 font-bold text-slate-700 font-mono tracking-wider">{escort.id_number || 'N/A'}</span></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50">
                No accompanying personnel recorded for this visit.
              </div>
            )}
          </section>

        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}