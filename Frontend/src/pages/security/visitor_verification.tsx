// File: Frontend/src/pages/security/visitor_verification.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Camera, Upload, CheckCircle, X, Clock, MapPin, FileText, Users, ExternalLink, AlertCircle } from 'lucide-react';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

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

  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([
    { id: 'identity', title: 'Verify Physical ID', description: 'Cross-check physical ID with submitted document', completed: false, required: true },
    { id: 'photo', title: 'Capture Photo', description: 'Take real-time kiosk photo', completed: false, required: true },
    { id: 'escort', title: 'Verify Escorts', description: 'Confirm accompanying personnel match manifest', completed: false, required: false },
    { id: 'badge', title: 'Issue Access Badge', description: 'Print and encode smart badge', completed: false, required: true },
  ]);

  useEffect(() => {
    fetchVisitor();
  }, [visitorId]);

  const fetchVisitor = async () => {
    try {
      setLoading(true);
      
      // FIX: Joining the escorts array into the payload
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          visitors (*),
          host:employees!visits_host_employee_id_fkey(name),
          escorts (*)
        `)
        .eq('visitor_id', visitorId) 
        .ilike('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      // FIX: Proper timezone formatting for UI
      const scheduleDate = data.start_date ? new Date(data.start_date).toLocaleDateString('en-GB') : 'TBD';
      const checkInTime = data.visitors?.checked_in_time ? new Date(data.visitors.checked_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Pending Gate Arrival';

      setVisitor({
        id: data.visitor_id,
        visit_id: data.visit_id,
        visitor_name: data.visitors?.name || 'Unknown',
        visitor_email: data.visitors?.email || 'N/A',
        visitor_gender: data.visitors?.gender || 'N/A',
        identity_type: data.visitors?.id_type || 'Govt ID',
        identity_number: data.visitors?.id_number || 'N/A',
        purpose: data.purpose || 'General',
        employee_name: data.host?.name || 'Unassigned',
        status: data.status,
        document_url: data.document_url || data.visitors?.document_url || null, // Map the document
        escorts: data.escorts || [], // Map the escorts
        schedule_date: scheduleDate,
        checked_in: checkInTime,
      });
      
    } catch (error) {
      console.error('Error fetching visitor:', error);
      alert('Approved pass not found for this visitor ID.');
      navigate('/security');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        // FIX: Force the video to play, overcoming some browser stall issues
        cameraRef.current.play(); 
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Camera access blocked. Please check your browser URL bar permissions.');
    }
  };

  const capturePhoto = () => {
    if (cameraRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(cameraRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setPhotoUrl(imageData);

        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `visitor-${visitorId}.jpg`, { type: 'image/jpeg' });
            setPhotoFile(file);
          }
        });

        if (cameraRef.current.srcObject) {
          const tracks = (cameraRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach((track) => track.stop());
        }
        setShowCamera(false);
        toggleStep('photo');
      }
    }
  };

  const toggleStep = (stepId: string) => {
    setVerificationSteps(
      verificationSteps.map((step) =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      )
    );
  };

  const uploadPhoto = async () => {
    if (!photoFile || !visitor) return;
    try {
      setUploading(true);
      const fileName = `visitor-photos/${visitor.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('visitor_documents')
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('visitor_documents').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('visitors')
        .update({ visitor_photo_url: data.publicUrl })
        .eq('visitor_id', visitor.id); 

      if (updateError) throw updateError;
      alert('Photo securely attached to dossier.');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
        setPhotoFile(file);
        toggleStep('photo');
      };
      reader.readAsDataURL(file);
    }
  };

  const completeCheckin = async () => {
    if (!visitor) return;
    try {
      setUploading(true);
      const checkInStamp = new Date().toISOString();

      const { error: visitError } = await supabase
        .from('visits')
        .update({ status: 'Active' })
        .eq('visit_id', visitor.visit_id); 
      if (visitError) throw visitError;

      const { error: visitorError } = await supabase
        .from('visitors')
        .update({ checked_in_time: checkInStamp })
        .eq('visitor_id', visitor.id); 
      if (visitorError) throw visitorError;

      await supabase.from('audit_logs').insert([
        {
          visitor_id: visitor.id,
          action: 'checked_in',
          performed_by: 'Gate Security',
          performed_by_role: 'security',
          timestamp: checkInStamp,
          remarks: `Physical Check-in Authorized at Desk ${deskNumber}`,
        },
      ]);

      alert('Access Granted. Visitor Checked In.');
      navigate('/security');
    } catch (error) {
      console.error('Error completing check-in:', error);
      alert('Failed to authorize secure entry.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="security" userName="Gate Console">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!visitor) return null;
  const allRequiredCompleted = verificationSteps.filter((s) => s.required).every((s) => s.completed);

  return (
    <DashboardLayout role="security" userName="Gate Console">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/security')} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold text-sm shadow-sm transition-colors">
            ← Cancel & Return to Queue
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black text-slate-900">Zero-Trust Verification</h1>
            <p className="text-xs text-blue-600 font-mono font-bold uppercase tracking-widest">{visitor.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Identity Block */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 bg-emerald-50 border-l border-b border-emerald-100 rounded-bl-xl text-xs font-black text-emerald-700 uppercase tracking-widest">
                HR Approved
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-6">{visitor.visitor_name}</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6 pb-6 border-b border-slate-100">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</p><p className="text-slate-900 font-medium">{visitor.visitor_gender}</p></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID Type</p><p className="text-slate-900 font-medium">{visitor.identity_type}</p></div>
                <div className="col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID Number</p><p className="text-slate-900 font-mono font-bold text-lg tracking-widest">{visitor.identity_number}</p></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sponsor</p><p className="text-sm font-bold text-slate-800">{visitor.employee_name}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schedule</p><p className="text-sm font-bold text-slate-800">{visitor.schedule_date}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-In</p><p className="text-sm font-bold text-slate-800">{visitor.checked_in}</p></div>
                </div>
              </div>
            </div>

            {/* FIX: New Split Block for Documents and Escorts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Database ID Proof Viewer */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-blue-600" /> Submitted Identity Proof
                </h3>
                {visitor.document_url ? (
                  <div className="flex-1 flex flex-col">
                    <div className="bg-slate-100 rounded-lg flex-1 min-h-[150px] relative overflow-hidden group border border-slate-200">
                       <img src={visitor.document_url} alt="ID Document" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-sm">
                         <a href={visitor.document_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-lg flex items-center shadow-lg">
                           <ExternalLink className="w-3 h-3 mr-2" /> Expand Document
                         </a>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center p-6 text-center">
                    <p className="text-xs font-medium text-slate-400">No clearance documents attached to this profile.</p>
                  </div>
                )}
              </div>

              {/* Escort Manifest */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <div className="flex items-center"><Users className="w-4 h-4 mr-2 text-blue-600" /> Escort Manifest</div>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px]">{visitor.escorts.length} Personnel</span>
                </h3>
                {visitor.escorts.length > 0 ? (
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                    {visitor.escorts.map((escort: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-sm font-bold text-slate-900 mb-1">{escort.name}</p>
                        <p className="text-xs font-mono text-slate-500">{escort.id_type}: {escort.id_number}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl p-6 text-center">
                    <p className="text-xs font-medium text-slate-400 italic">No accompanying personnel requested.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Photo Capture Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center">
                <Camera className="w-4 h-4 mr-2 text-blue-600" /> Security Photo Kiosk
              </h3>

              {!photoUrl ? (
                <div className="mb-2">
                  {!showCamera ? (
                    <div className="flex gap-4">
                      <button onClick={startCamera} className="px-5 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
                        <Camera size={18} /> Initialize Camera
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="px-5 py-3 bg-white text-slate-700 font-bold text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                        <Upload size={18} /> Fallback Upload
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <video ref={cameraRef} autoPlay playsInline className="w-full rounded-xl bg-slate-900 border border-slate-800 h-[300px] object-cover" />
                      <div className="flex gap-4">
                        <button onClick={capturePhoto} className="flex-1 px-4 py-3 bg-emerald-600 font-bold text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                          Capture Image
                        </button>
                        <button onClick={() => {
                          if (cameraRef.current?.srcObject) {
                            const tracks = (cameraRef.current.srcObject as MediaStream).getTracks();
                            tracks.forEach((track) => track.stop());
                          }
                          setShowCamera(false);
                        }} className="flex-1 px-4 py-3 bg-white font-bold text-slate-700 rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-2 flex gap-6 items-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 shrink-0">
                    <img src={photoUrl} alt="Visitor" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-slate-500 font-medium">Image captured successfully. Save to attach to clearance manifest.</p>
                    <div className="flex gap-3">
                      <button onClick={uploadPhoto} disabled={uploading} className="px-5 py-2.5 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm text-sm">
                        {uploading ? 'Encrypting...' : 'Lock & Save Photo'}
                      </button>
                      <button onClick={() => { setPhotoUrl(null); setPhotoFile(null); }} className="px-5 py-2.5 font-bold bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm">
                        Retake
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm sticky top-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 border-b border-slate-100 pb-3">
                Validation Matrix
              </h3>
              
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assigned Gate Authority</label>
                <select
                  value={deskNumber}
                  onChange={(e) => setDeskNumber(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                >
                  <option value={1}>Desk 1 - Main Gate</option>
                  <option value={2}>Desk 2 - East Wing</option>
                  <option value={3}>Desk 3 - Service Gate</option>
                </select>
              </div>

              <div className="space-y-2 mb-8">
                {verificationSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${step.completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                    onClick={() => toggleStep(step.id)}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${step.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'}`}>
                      {step.completed && <CheckCircle size={14} strokeWidth={3} />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${step.completed ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {step.title} {step.required && <span className="text-rose-500">*</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={completeCheckin}
                disabled={!allRequiredCompleted || uploading}
                className={`w-full px-4 py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-sm transition-all ${
                  allRequiredCompleted
                    ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                {uploading ? 'Processing Secure Entry...' : 'Grant Facility Access'}
              </button>

              {!allRequiredCompleted && (
                <p className="text-[10px] font-bold text-amber-500 mt-4 text-center uppercase tracking-wider flex items-center justify-center">
                  <AlertCircle className="w-3 h-3 mr-1" /> Awaiting mandatory validations
                </p>
              )}
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} width={640} height={480} className="hidden" />
      </div>
    </DashboardLayout>
  );
}