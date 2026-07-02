import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Camera, Upload, MessageSquare, CheckCircle, Clock, FileText, Users, ExternalLink, ShieldAlert, AlertOctagon, X, Ban } from 'lucide-react';
import SecurityNotificationCenter from './SecurityNotificationCenter';

export default function VisitorVerification() {
  const { visitorId } = useParams<{ visitorId: string }>();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState({ id: '', empId: '', name: 'Loading...', role: '' });
  
  const [visitor, setVisitor] = useState<Record<string, any> | null>(null); 
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

  const [securityNote, setSecurityNote] = useState('');
  const [denyModal, setDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  const [steps, setSteps] = useState([
    { id: 'identity', title: 'Verify Identity Proof', completed: false, required: true },
    { id: 'photo', title: 'Capture Kiosk Photo', completed: false, required: true },
    { id: 'escorts', title: 'Verify Accompanying Persons', completed: false, required: false },
    { id: 'badge', title: 'Issue Access Badge', completed: false, required: true },
  ]);

  useEffect(() => {
    const initSecurityScope = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUser({
            id: emp.id,
            empId: emp.employee_id,
            name: emp.name,
            role: emp.role || 'security'
          });
        }
      } catch (err) {
        console.error('Failed to load guard profile', err);
        setCurrentUser(prev => ({ ...prev, name: 'Gate Console' }));
      }
    };
    initSecurityScope();
  }, []);

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

      let expiryTime = new Date();
      if (data.end_date) {
        expiryTime = new Date(data.end_date);
      } else {
        expiryTime.setHours(18, 0, 0, 0); 
      }

      const diffTime = expiryTime.getTime() - new Date().getTime();
      const daysLeftRaw = diffTime / (1000 * 60 * 60 * 24);
      let daysLeftDisplay;
      
      if (daysLeftRaw < 0) {
        daysLeftDisplay = 'Expired';
      } else if (daysLeftRaw < 1) {
        daysLeftDisplay = 'Expires Today';
      } else {
        daysLeftDisplay = `${Math.ceil(daysLeftRaw)} Days Left`;
      }

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
        hr_remarks: data.hr_remarks || '',  
        pass_type: data.pass_type ? data.pass_type.replace('_', ' ') : 'One Day',
        expiry_full: expiryTime.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        days_left: daysLeftDisplay,
        expiry: expiryTime.toISOString(),
        expiry_display: expiryTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        
        // Map Ban Details
        is_banned: data.visitors?.is_banned || false,
        banned_reason: data.visitors?.banned_reason || '',
        banned_at: data.visitors?.banned_at || null,
      });

      const mappedEscorts = (data.escorts || []).map((e:any) => ({ ...e, verified: false }));
      setEscorts(mappedEscorts);
      
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
      await supabase.from('visits').update({ visitor_photo_url: data.publicUrl }).eq('visit_id', visitor.id); 
      setVisitor(prev => ({ ...prev, visitor_photo_url: data.publicUrl }));
      alert('Photo securely attached to current pass.');
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
      const updates = { 
        status: 'Active', 
        expected_out: visitor.expiry,
        security_remarks: securityNote || null 
      };

      await supabase.from('visits').update(updates).eq('visit_id', visitor.visit_id); 
      await supabase.from('visitors').update({ checked_in_time: checkInStamp }).eq('visitor_id', visitor.id); 
      
      await supabase.from('time_tracking_logs').insert([{
        visit_id: visitor.visit_id,
        visitor_id: visitor.id,
        check_in_time: checkInStamp,
        expected_out_time: visitor.expiry,
        time_exceeded: false,
        logged_to_forensic: false
      }]);

      await supabase.from('audit_logs').insert([{
        visitor_id: visitor.id, 
        action: 'checked_in', 
        performed_by_id: currentUser.empId || currentUser.id,
        performed_by: currentUser.name,
        performed_by_role: 'security', 
        remarks: `[ENTRY GRANTED] Desk ${deskNumber} by Guard ${currentUser.name}. ${securityNote ? `Guard Note: ${securityNote}` : ''}`
      }]);
      
      alert('Access Granted. Real-time forensic monitoring initiated.');
      navigate('/security');
    } catch (error) { 
      alert('Check-in sequence failed to communicate with central DB.'); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleDenyEntry = async () => {
    if (!visitor || !denyReason) return;
    setUploading(true);
    try {
      await supabase.from('visits').update({ 
        status: 'Denied', 
        security_remarks: `[DENIED AT GATE]: ${denyReason}` 
      }).eq('visit_id', visitor.visit_id); 
      
      await supabase.from('audit_logs').insert([{
        visitor_id: visitor.id, 
        action: 'rejected', 
        performed_by_id: currentUser.empId || currentUser.id,
        performed_by: currentUser.name, 
        performed_by_role: 'security', 
        severity: 'High',
        remarks: `[ENTRY DENIED] Security blocked facility access at Gate ${deskNumber}. Reason: ${denyReason}`
      }]);
      
      alert('Visitor denied. HR has been explicitly notified.');
      navigate('/security');
    } catch (error) { 
      alert('Failed to process denial.'); 
    } finally { 
      setUploading(false); 
    }
  };

  if (loading) return <DashboardLayout role="security" userName={currentUser.name} headerAction={<SecurityNotificationCenter />}><div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-900"></div></div></DashboardLayout>;
  if (!visitor) return null;

  // Lock out the Authorize button completely if banned
  const allDone = steps.filter(s => s.required).every(s => s.completed) && !visitor.is_banned;

  return (
    <DashboardLayout role="security" userName={currentUser.name} headerAction={<SecurityNotificationCenter />}>
      <div className="max-w-7xl mx-auto space-y-4">
        
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => navigate('/security')} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">← Back to Queue</button>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{visitor.id}</span>
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center text-slate-700 shadow-sm">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-xs font-bold uppercase mr-1">Pass Expiry:</span>
              <span className="text-sm font-black">{visitor.expiry_display}</span>
            </div>
          </div>
        </div>

        {/* HR BAN CRITICAL BANNER */}
        {visitor.is_banned && (
          <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-5 mb-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-4">
              <Ban className="w-10 h-10 text-rose-600 shrink-0" />
              <div>
                <h2 className="text-lg font-black text-rose-800 uppercase tracking-wider">Permanent Ban Active</h2>
                <p className="text-sm text-rose-700 mt-0.5">
                  <strong className="font-black">Reason:</strong> {visitor.banned_reason}
                </p>
                <p className="text-xs text-rose-600 mt-1 font-mono">
                  Banned on: {new Date(visitor.banned_at).toLocaleString('en-GB')}
                </p>
              </div>
            </div>
            <button onClick={() => { setDenyReason('HR Permanent Ban Active'); setDenyModal(true); }} className="w-full md:w-auto px-6 py-3 bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-sm hover:bg-rose-700 transition-colors">
              Enforce Denial
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900 mb-3">{visitor.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gender</span><span className="font-medium text-slate-800 truncate">{visitor.gender}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">DOB</span><span className="font-medium text-slate-800 truncate">{visitor.dob}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Designation</span><span className="font-medium text-slate-800 truncate">{visitor.designation}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Organization</span><span className="font-medium text-slate-800 truncate">{visitor.organization}</span></div>

                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</span><span className="font-medium text-slate-800 truncate">{visitor.email}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone</span><span className="font-medium text-slate-800 font-mono">{visitor.phone}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ID Type</span><span className="font-medium text-slate-800">{visitor.id_type}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ID Number</span><span className="font-bold font-mono text-slate-900 tracking-wider">{visitor.id_number}</span></div>
                
                <div className="col-span-2 md:col-span-4 border-t border-slate-200/60 pt-3 mt-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Address</span>
                  <span className="font-medium text-slate-800">{visitor.address}</span>
                </div>
                <div className="col-span-2 md:col-span-4 border-t border-slate-200/60 pt-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Authorized Pass Type</span>
                    <span className="font-bold text-blue-700 uppercase tracking-wide">{visitor.pass_type}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Expiry Date & Time</span>
                    <span className="font-bold text-slate-800">{visitor.expiry_full}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Validity Remaining</span>
                    <span className={`font-bold ${visitor.days_left === 'Expired' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {visitor.days_left}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center"><FileText className="w-3 h-3 mr-2 text-blue-600"/> Submitted ID Proof</h3>
                {visitor.document_url ? (
                  <div className="relative group bg-slate-100 rounded-lg border border-slate-200 h-48 overflow-hidden">
                    <img src={visitor.document_url} alt="ID" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <a href={visitor.document_url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold backdrop-blur-[2px]"><ExternalLink className="w-3 h-3 mr-1.5"/> View Document Fullscreen</a>
                  </div>
                ) : <div className="h-48 bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">No Identity Document Attached</div>}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span className="flex items-center"><Users className="w-3 h-3 mr-2 text-blue-600"/> Escort Manifest</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold text-[10px]">{escorts.length} Persons</span>
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {escorts.length > 0 ? escorts.map((escort, i) => (
                    <div key={i} className={`p-3 border rounded-lg text-xs flex flex-col cursor-pointer transition-colors ${escort.verified ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`} onClick={() => handleEscortVerify(i)}>
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200/60">
                        <p className="font-bold text-slate-900 text-sm">{escort.name}</p>
                        <div className={`w-4 h-4 rounded border flex justify-center items-center transition-colors ${escort.verified ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>{escort.verified && <CheckCircle size={10} strokeWidth={3}/>}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px]">
                        <div><span className="text-slate-400 font-bold uppercase tracking-wider">ID:</span> <span className="text-slate-700 font-mono font-medium">{escort.id_type} {escort.id_number}</span></div>
                        <div><span className="text-slate-400 font-bold uppercase tracking-wider">Phone:</span> <span className="text-slate-700 font-mono font-medium">{escort.phone || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-bold uppercase tracking-wider">Gender:</span> <span className="text-slate-700 font-medium">{escort.gender || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-bold uppercase tracking-wider">DOB:</span> <span className="text-slate-700 font-medium">{escort.dob || 'N/A'}</span></div>
                        <div className="col-span-2 pt-0.5"><span className="text-slate-400 font-bold uppercase tracking-wider">Nationality:</span> <span className="text-slate-700 font-medium">{escort.nationality || 'N/A'}</span></div>
                      </div>
                    </div>
                  )) : <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium mt-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">No accompanying personnel.</div>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center"><Camera className="w-3 h-3 mr-2 text-blue-600"/> Security Photo Kiosk</h3>
              {!photoUrl ? (
                <div>
                  {!showCamera ? (
                    <div className="flex gap-3">
                      <button onClick={startCamera} className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors flex items-center shadow-sm"><Camera className="w-3 h-3 mr-1.5"/> Start Camera</button>
                      <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center"><Upload className="w-3 h-3 mr-1.5"/> Fallback Upload</button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => { setPhotoUrl(ev.target?.result as string); setPhotoFile(f); toggleStep('photo'); }; r.readAsDataURL(f); } }} className="hidden" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <video ref={cameraRef} autoPlay playsInline className="w-full h-48 object-cover bg-slate-900 rounded-lg shadow-inner" />
                      <div className="flex gap-3">
                        <button onClick={capturePhoto} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">Capture Image</button>
                        <button onClick={() => setShowCamera(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-5 items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <img src={photoUrl} className="w-20 h-20 object-cover rounded-full border-4 border-white shadow-md" alt="Captured"/>
                  <div className="flex gap-3">
                    <button onClick={uploadPhoto} disabled={uploading} className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-blue-700 transition-colors">{uploading ? 'Encrypting...' : 'Lock & Save Photo'}</button>
                    <button onClick={() => setPhotoUrl(null)} className="px-5 py-2.5 bg-white text-slate-700 font-bold text-xs rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">Retake</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm sticky top-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-5">Validation Matrix</h3>
              
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gate Authority Assignment</label>
                <select value={deskNumber} onChange={(e) => setDeskNumber(Number(e.target.value))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow">
                  <option value={1}>Desk 1 - Main Gate</option>
                  <option value={2}>Desk 2 - East Wing</option>
                  <option value={3}>Desk 3 - Service Gate</option>
                </select>
              </div>

              <div className="space-y-2 mb-8">
                {steps.map(step => (
                  <div key={step.id} onClick={() => step.id !== 'escorts' && toggleStep(step.id)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${step.completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${step.completed ? 'bg-emerald-500 text-white border-emerald-500' : 'border-2 border-slate-300 bg-white'}`}>{step.completed && <CheckCircle size={14} strokeWidth={3}/>}</div>
                    <p className={`text-sm font-bold ${step.completed ? 'text-emerald-900' : 'text-slate-700'}`}>{step.title} {step.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                  </div>
                ))}
              </div>
                <div className="mb-6">
                <label className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <MessageSquare className="w-3 h-3 mr-1" /> Security Officer Notes (Optional)
                </label>
                <textarea 
                  value={securityNote} 
                  onChange={(e) => setSecurityNote(e.target.value)} 
                  rows={2} 
                  placeholder="e.g. Issued physical badge #402, Visitor brought laptop..." 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow resize-none"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={completeCheckin} disabled={!allDone || uploading || visitor.is_banned} className={`w-full py-3.5 rounded-lg font-bold text-xs tracking-widest shadow-sm transition-all ${allDone ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}>
                  {uploading ? 'Processing Secure Entry...' : 'Authorize Facility Access'}
                </button>
                <button onClick={() => setDenyModal(true)} disabled={uploading} className="w-full py-3.5 rounded-lg font-bold text-xs tracking-widest bg-red-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors">
                  Deny Entry
                </button>
              </div>
              {!allDone && !visitor.is_banned && <p className="text-[10px] font-bold text-amber-600 mt-4 text-center uppercase tracking-wider flex items-center justify-center"><ShieldAlert className="w-3 h-3 mr-1.5"/> Awaiting Mandatory Validations</p>}
              {visitor.is_banned && <p className="text-[10px] font-bold text-rose-600 mt-4 text-center uppercase tracking-wider flex items-center justify-center"><Ban className="w-3 h-3 mr-1.5"/> Authorization Locked by HR</p>}
            </div>
          </div>
        </div>
        
        {/* Security Deny Modal */}
        {denyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-rose-100 transform scale-100 transition-all">
              <div className="p-5 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                <h3 className="font-bold text-rose-800 flex items-center"><AlertOctagon className="w-5 h-5 mr-2"/> Deny Access</h3>
                <button onClick={() => setDenyModal(false)} className="text-rose-400 hover:text-rose-700 transition-colors"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm font-medium text-slate-600">This will reject the visitor at the gate. The reason will be immediately sent to HR for review.</p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Reason for Denial (Required)</label>
                  <textarea autoFocus value={denyReason} onChange={e => setDenyReason(e.target.value)} rows={3} placeholder="e.g. Identity mismatch, aggressive behavior, unverified escort..." className="w-full border-2 border-rose-100 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 bg-rose-50/30 resize-none transition-shadow"/>
                </div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setDenyModal(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-sm">Cancel</button>
                  <button onClick={handleDenyEntry} disabled={!denyReason || uploading} className="flex-1 py-3 font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm disabled:opacity-50 transition-colors text-sm">
                    {uploading ? 'Processing...' : 'Confirm Denial'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} width={640} height={480} className="hidden" />
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </DashboardLayout>
  );
}