// File: src/pages/security/visitor_verification.tsx
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Camera, Upload, CheckCircle, Clock, FileText, Users, ExternalLink, ShieldAlert } from 'lucide-react';

export default function VisitorVerification() {
  const { visitorId } = useParams<{ visitorId: string }>();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [deskNumber, setDeskNumber] = useState(1);
  const [escorts, setEscorts] = useState<any[]>([]);

  const [steps, setSteps] = useState([
    { id: 'identity', title: 'Verify Identity Proof', completed: false, required: true },
    { id: 'photo', title: 'Capture Photo', completed: false, required: true },
    { id: 'escorts', title: 'Verify Accompanying Persons', completed: false, required: false },
    { id: 'badge', title: 'Issue Access Badge', completed: false, required: true },
  ]);

  useEffect(() => { fetchVisitor(); }, [visitorId]);

  const fetchVisitor = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select(`*, visitors (*), host:employees!visits_host_employee_id_fkey(name), escorts (*)`)
        .eq('visitor_id', visitorId) 
        .ilike('status', 'approved')
        .order('created_at', { ascending: false }).limit(1).single();

      if (error) throw error;

      // Auto-calculate expiry (Default to 18:00 today if duration isn't set, else add hours)
      const now = new Date();
      let expiryTime = new Date(now.setHours(18, 0, 0, 0)); // default 6 PM
      if (data.duration_hours) {
        expiryTime = new Date(new Date().getTime() + data.duration_hours * 3600000);
      }

      // FIX: Added aggressive fallbacks to catch multiple possible database column naming conventions
      setVisitor({
        id: data.visitor_id,
        visit_id: data.visit_id,
        name: data.visitors?.name || 'Unknown',
        email: data.visitors?.email || data.visitors?.visitor_email || 'N/A',
        phone: data.visitors?.phone || 'N/A',
        dob: data.visitors?.dob || 'N/A',
        gender: data.visitors?.gender || data.visitors?.visitor_gender || 'Others',
        address: data.visitors?.address || 'N/A',
        designation: data.visitors?.designation || 'N/A',
        organization: data.visitors?.organization || 'N/A',
        id_type: data.visitors?.id_type || 'Govt ID',
        id_number: data.visitors?.id_number || data.visitors?.identity_number || 'N/A',
        host: data.host?.name || 'Unassigned',
        document_url: data.document_url || data.visitors?.document_url || null,
        expiry: expiryTime.toISOString(),
        expiry_display: expiryTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      });

      const mappedEscorts = (data.escorts || []).map((e:any) => ({ ...e, verified: false }));
      setEscorts(mappedEscorts);
      
      // Auto-complete escort step if no escorts exist
      if (mappedEscorts.length === 0) {
        setSteps(s => s.map(step => step.id === 'escorts' ? {...step, completed: true, required: false} : step));
      } else {
        setSteps(s => s.map(step => step.id === 'escorts' ? {...step, required: true} : step));
      }

    } catch (error) {
      console.error('Error:', error);
      alert('Approved pass not found.');
      navigate('/security');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (cameraRef.current) { cameraRef.current.srcObject = stream; cameraRef.current.play(); setShowCamera(true); }
    } catch (error) { alert('Camera access blocked. Please check browser permissions.'); }
  };

  const capturePhoto = () => {
    if (cameraRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(cameraRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        setPhotoUrl(canvasRef.current.toDataURL('image/jpeg'));
        canvasRef.current.toBlob((blob) => {
          if (blob) setPhotoFile(new File([blob], `visitor-${visitorId}.jpg`, { type: 'image/jpeg' }));
        });
        const tracks = (cameraRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        setShowCamera(false);
        toggleStep('photo');
      }
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile || !visitor) return;
    setUploading(true);
    try {
      const fileName = `visitor-photos/${visitor.id}-${Date.now()}.jpg`;
      await supabase.storage.from('visitor_documents').upload(fileName, photoFile, { upsert: true });
      const { data } = supabase.storage.from('visitor_documents').getPublicUrl(fileName);
      await supabase.from('visitors').update({ visitor_photo_url: data.publicUrl }).eq('visitor_id', visitor.id); 
      alert('Photo attached.');
    } catch (error) {
      alert('Failed to save photo');
    } finally {
      setUploading(false);
    }
  };

  const toggleStep = (id: string) => setSteps(s => s.map(step => step.id === id ? { ...step, completed: !step.completed } : step));
  
  const handleEscortVerify = (index: number) => {
    const updated = [...escorts];
    updated[index].verified = !updated[index].verified;
    setEscorts(updated);
    if (updated.every(e => e.verified)) toggleStep('escorts');
    else setSteps(s => s.map(step => step.id === 'escorts' ? { ...step, completed: false } : step));
  };

  const completeCheckin = async () => {
    if (!visitor) return;
    setUploading(true);
    try {
      const checkInStamp = new Date().toISOString();
      await supabase.from('visits').update({ status: 'Active', expected_out: visitor.expiry }).eq('visit_id', visitor.visit_id); 
      await supabase.from('visitors').update({ checked_in_time: checkInStamp }).eq('visitor_id', visitor.id); 
      await supabase.from('audit_logs').insert([{
        visitor_id: visitor.id, action: 'checked_in', performed_by: 'Gate Security', performed_by_role: 'security', remarks: `Checked in at Desk ${deskNumber}. Expiry set to ${visitor.expiry_display}`
      }]);
      alert('Access Granted. Monitoring initiated.');
      navigate('/security');
    } catch (error) { alert('Check-in failed.'); } finally { setUploading(false); }
  };

  if (loading) return <DashboardLayout role="security" userName="Gate Console"><div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-900"></div></div></DashboardLayout>;
  if (!visitor) return null;

  const allDone = steps.filter(s => s.required).every(s => s.completed);

  return (
    <DashboardLayout role="security" userName="Gate Console">
      <div className="max-w-7xl mx-auto space-y-4">
        
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <button onClick={() => navigate('/security')} className="text-sm font-bold text-slate-500 hover:text-slate-800">← Back</button>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded">{visitor.id}</span>
            <div className="bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-md flex items-center text-rose-800">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-xs font-bold uppercase mr-1">Pass Expiry:</span>
              <span className="text-sm font-black">{visitor.expiry_display}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          <div className="lg:col-span-2 space-y-3">
            {/* Ultra-Compact Identity Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900 mb-3">{visitor.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-slate-50 p-3 rounded border border-slate-100">
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Gender</span><span className="font-medium text-slate-800 truncate">{visitor.gender}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">DOB</span><span className="font-medium text-slate-800 truncate">{visitor.dob}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Designation</span><span className="font-medium text-slate-800 truncate">{visitor.designation}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Organization</span><span className="font-medium text-slate-800 truncate">{visitor.organization}</span></div>

                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Email</span><span className="font-medium text-slate-800 truncate">{visitor.email}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Phone</span><span className="font-medium text-slate-800">{visitor.phone}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">ID Type</span><span className="font-medium text-slate-800">{visitor.id_type}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">ID Number</span><span className="font-bold font-mono text-slate-900">{visitor.id_number}</span></div>
                
                {/* Full Width Address Row */}
                <div className="col-span-2 md:col-span-4 border-t border-slate-200/50 pt-2 mt-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Address</span>
                  <span className="font-medium text-slate-800">{visitor.address}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Document Embed */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col">
                <h3 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center"><FileText className="w-3 h-3 mr-1.5 text-blue-600"/> Submitted ID Proof</h3>
                {visitor.document_url ? (
                  <div className="relative group bg-slate-100 rounded border border-slate-200 h-48 overflow-hidden">
                    <img src={visitor.document_url} alt="ID" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" />
                    <a href={visitor.document_url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white text-xs font-bold"><ExternalLink className="w-3 h-3 mr-1"/> View Full</a>
                  </div>
                ) : <div className="h-48 bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-xs text-slate-400">No Document</div>}
              </div>

              {/* FIX: Escorts Redesigned with all requested details */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col">
                <h3 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center justify-between">
                  <span className="flex items-center"><Users className="w-3 h-3 mr-1.5 text-blue-600"/> Accompanying ({escorts.length})</span>
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {escorts.length > 0 ? escorts.map((escort, i) => (
                    <div key={i} className={`p-3 border rounded-lg text-xs flex flex-col cursor-pointer transition ${escort.verified ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`} onClick={() => handleEscortVerify(i)}>
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200/60">
                        <p className="font-bold text-slate-900 text-sm">{escort.name}</p>
                        <div className={`w-4 h-4 rounded border flex justify-center items-center ${escort.verified ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>{escort.verified && <CheckCircle size={10}/>}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px]">
                        <div><span className="text-slate-400 font-bold uppercase">ID:</span> <span className="text-slate-700 font-mono font-medium">{escort.id_type} {escort.id_number}</span></div>
                        <div><span className="text-slate-400 font-bold uppercase">Phone:</span> <span className="text-slate-700 font-medium">{escort.phone || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-bold uppercase">Gender:</span> <span className="text-slate-700 font-medium">{escort.gender || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-bold uppercase">DOB:</span> <span className="text-slate-700 font-medium">{escort.dob || 'N/A'}</span></div>
                        <div className="col-span-2"><span className="text-slate-400 font-bold uppercase">Nationality:</span> <span className="text-slate-700 font-medium">{escort.nationality || 'N/A'}</span></div>
                      </div>
                    </div>
                  )) : <div className="h-full flex items-center justify-center text-xs text-slate-400 mt-12">No escorts required.</div>}
                </div>
              </div>
            </div>

            {/* Photo Kiosk */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center"><Camera className="w-3 h-3 mr-1.5 text-blue-600"/> Security Photo</h3>
              {!photoUrl ? (
                <div>
                  {!showCamera ? (
                    <div className="flex gap-3">
                      <button onClick={startCamera} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800"><Camera className="inline w-3 h-3 mr-1"/> Start Camera</button>
                      <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded hover:bg-slate-50"><Upload className="inline w-3 h-3 mr-1"/> Upload</button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => { setPhotoUrl(ev.target?.result as string); setPhotoFile(f); toggleStep('photo'); }; r.readAsDataURL(f); } }} className="hidden" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <video ref={cameraRef} autoPlay playsInline className="w-full h-48 object-cover bg-black rounded" />
                      <div className="flex gap-2">
                        <button onClick={capturePhoto} className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded">Capture</button>
                        <button onClick={() => setShowCamera(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-3 items-center">
                  <img src={photoUrl} className="w-20 h-20 object-cover rounded-full border-2 border-slate-200" alt="Captured"/>
                  <div className="flex gap-2">
                    <button onClick={uploadPhoto} disabled={uploading} className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded shadow-sm">{uploading ? 'Saving...' : 'Lock Photo'}</button>
                    <button onClick={() => setPhotoUrl(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded border border-slate-200">Retake</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm sticky top-6">
              <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-100 pb-2 mb-4">Clearance Checklist</h3>
              
              <select value={deskNumber} onChange={(e) => setDeskNumber(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold text-slate-700 bg-slate-50 mb-5 outline-none">
                <option value={1}>Desk 1 - Main Gate</option>
                <option value={2}>Desk 2 - East Wing</option>
                <option value={3}>Desk 3 - Service Gate</option>
              </select>

              <div className="space-y-2 mb-6">
                {steps.map(step => (
                  <div key={step.id} onClick={() => step.id !== 'escorts' && toggleStep(step.id)} className={`flex items-center gap-3 p-2.5 rounded border cursor-pointer ${step.completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${step.completed ? 'bg-emerald-500 text-white' : 'border border-slate-300'}`}>{step.completed && <CheckCircle size={12} strokeWidth={3}/>}</div>
                    <p className={`text-xs font-bold ${step.completed ? 'text-emerald-900' : 'text-slate-700'}`}>{step.title} {step.required && <span className="text-rose-500">*</span>}</p>
                  </div>
                ))}
              </div>

              <button onClick={completeCheckin} disabled={!allDone || uploading} className={`w-full py-3 rounded font-black text-xs uppercase tracking-wider ${allDone ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}>
                {uploading ? 'Processing...' : 'Authorize Entry'}
              </button>
              {!allDone && <p className="text-[10px] font-bold text-amber-500 mt-3 text-center uppercase"><ShieldAlert className="inline w-3 h-3 mr-1"/> Pending Validations</p>}
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />
      </div>
    </DashboardLayout>
  );
}