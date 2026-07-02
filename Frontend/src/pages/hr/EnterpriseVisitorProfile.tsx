import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, ShieldAlert, Printer, UserMinus, Clock, 
  MessageSquare, CheckCircle, FileText, MapPin, Activity, 
  EyeOff, Eye, Building, Briefcase, ChevronRight, ArrowLeft,
  Search, ExternalLink, User, AlertOctagon, X
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import VisitDetailDrawer from '../../components/common/hrVisitorDrawer';
import { supabase } from '../../lib/supabase';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';

export default function EnterpriseVisitorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Current HR User Data
  const [currentUser, setCurrentUser] = useState({ id: '', empId: '', name: 'Loading...' });

  const [loading, setLoading] = useState(true);
  const [visitor, setVisitor] = useState<any>(null);
  const [currentPass, setCurrentPass] = useState<any>(null);
  
  // Timelines & History
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [forensics, setForensics] = useState<any[]>([]);
  
  // Drawer & UI States
  const [isIdMasked, setIsIdMasked] = useState(true);
  const [searchHistory, setSearchHistory] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVisitLog, setSelectedVisitLog] = useState<any>(null);

  // Revoke Modal State
  const [revokeModal, setRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    const initHRUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUser({ id: emp.id, empId: emp.employee_id, name: emp.name });
        }
      } catch (err) {
        console.error('Failed to load HR profile', err);
        setCurrentUser(prev => ({ ...prev, name: 'HR Admin' }));
      }
    };
    initHRUser();
  }, []);

  useEffect(() => {
    async function fetchVisitorData() {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);

        // 1. Fetch Visits & Profile
        const { data, error } = await supabase
          .from('visits')
          .select(`
            *,
            visitors(*),
            host:employees!visits_host_employee_id_fkey(name),
            escorts(*)
          `)
          .eq('visitor_id', id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const latestVisit = data[0];
          setVisitor(latestVisit.visitors);
          setCurrentPass(latestVisit);
          setVisitHistory(data);
        } else {
          // Fallback if they are registered but have no visits
          const { data: vData } = await supabase.from('visitors').select('*').eq('visitor_id', id).single();
          if (vData) setVisitor(vData);
        }

        // 2. Fetch Forensics for the timeline
        const { data: forensicData } = await supabase
          .from('forensic_incidents')
          .select('*')
          .eq('visitor_id', id)
          .order('created_at', { ascending: false });
        
        if (forensicData) setForensics(forensicData);

      } catch (err) {
        console.error("Error fetching enterprise profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchVisitorData();
  }, [id]);

  const handleOpenVisitDetails = (visitLog: any) => {
    setSelectedVisitLog(visitLog);
    setIsDrawerOpen(true);
  };

  // ✅ ACTION: Emergency Revocation
  const handleRevokeAccess = async () => {
    if (!currentPass || !revokeReason) return;
    setIsRevoking(true);
    
    try {
      const now = new Date().toISOString();
      
      // 1. Terminate Pass
      await supabase.from('visits').update({ status: 'Revoked', actual_out: now }).eq('visit_id', currentPass.visit_id);
      await supabase.from('visitors').update({ checked_out_time: now }).eq('visitor_id', visitor.visitor_id);
      
      // 2. Terminate Time Tracking
      await supabase.from('time_tracking_logs').update({ actual_out_time: now, logged_to_forensic: true }).eq('visit_id', currentPass.visit_id);
        
      // 3. Inject Critical Forensic Incident for Security Terminal
      await supabase.from('forensic_incidents').insert([{
        visitor_id: visitor.visitor_id,
        visit_id: currentPass.visit_id,
        incident_type: 'emergency_revocation',
        severity: 'Critical',
        reason: revokeReason,
        reported_by: currentUser.name,
        status: 'open'
      }]);
      
      // 4. Record Strict HR Audit Log
      await supabase.from('audit_logs').insert([{
        visitor_id: visitor.visitor_id,
        action: 'emergency_removal',
        performed_by_id: currentUser.empId || currentUser.id,
        performed_by: currentUser.name,
        performed_by_role: 'hr',
        severity: 'Critical',
        remarks: `[HR REVOCATION EXECUTED]: ${revokeReason}`
      }]);
      
      setRevokeModal(false);
      setCurrentPass({ ...currentPass, status: 'Revoked' });
      alert('Access strictly revoked. Security has been flagged.');
    } catch (err) {
      alert('Failed to execute revocation protocol.');
    } finally {
      setIsRevoking(false);
    }
  };

  // ✅ ACTION: Trigger Print Badge
  const handlePrintBadge = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout role="hr" userName={currentUser.name}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-full mb-4"></div>
            <p className="text-slate-500 font-medium">Decrypting secure dossier...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!visitor) {
    return (
      <DashboardLayout role="hr" userName={currentUser.name}>
        <div className="text-center mt-20">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Dossier Not Found</h2>
          <p className="text-slate-500 mt-2">No active records exist for this profile ID.</p>
          <button onClick={() => navigate(-1)} className="mt-6 text-blue-600 font-bold hover:underline">Return to Ledger</button>
        </div>
      </DashboardLayout>
    );
  }

  const rawId = visitor.id_number || 'N/A';
  const maskedId = isIdMasked && rawId.length > 4 
    ? `XXXX-XXXX-${rawId.slice(-4)}` 
    : rawId;

  const displayStatus = currentPass?.status || 'No Active Pass';
  const statusColor = 
    displayStatus === 'Approved' || displayStatus === 'Active' || displayStatus === 'Cleared' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
    displayStatus === 'Pending' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
    displayStatus === 'Denied' || displayStatus === 'Revoked' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' :
    'bg-slate-500/20 border-slate-500/30 text-slate-400';

  const filteredHistory = visitHistory.filter(log => 
    log.visit_id.toLowerCase().includes(searchHistory.toLowerCase()) || 
    (log.purpose && log.purpose.toLowerCase().includes(searchHistory.toLowerCase()))
  );

  // Combine Visits and Forensics into one Chronological Timeline
  const combinedTimeline = [
    ...visitHistory.map(v => ({
      id: v.visit_id,
      type: 'visit',
      timestamp: new Date(v.start_date || v.created_at).getTime(),
      dateObj: new Date(v.start_date || v.created_at),
      title: `Pass ${v.status} — ${v.department || 'General Base'}`,
      subtitle: `ID: ${v.visit_id}`,
      status: v.status
    })),
    ...forensics.map(f => ({
      id: f.id,
      type: 'incident',
      timestamp: new Date(f.created_at).getTime(),
      dateObj: new Date(f.created_at),
      title: `Security Alert: ${f.incident_type.replace('_', ' ').toUpperCase()}`,
      subtitle: f.reason,
      status: f.severity 
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <DashboardLayout role="hr" userName={currentUser.name}>
      
      {/* 🖨️ PRINT-ONLY BADGE LAYOUT (Hidden on screen) */}
      <div className="hidden print:flex fixed inset-0 bg-white items-center justify-center z-[9999]">
        <div className="w-[300px] h-[450px] border-4 border-slate-900 rounded-2xl flex flex-col items-center justify-between p-6 relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 w-full h-24 bg-blue-600"></div>
          <div className="relative z-10 w-full text-center mb-4">
            <h1 className="text-white font-black tracking-widest uppercase text-xl">VISITOR PASS</h1>
            <p className="text-blue-100 text-xs font-mono">{currentPass?.visit_id}</p>
          </div>
          
          <div className="relative z-10 w-32 h-32 rounded-xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center mb-4">
            {visitor.visitor_photo_url ? (
              <img src={visitor.visitor_photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-400 font-black text-4xl">{visitor.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          
          <div className="relative z-10 w-full text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase">{visitor.name}</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{visitor.organization || 'Independent'}</p>
          </div>

          <div className="relative z-10 w-full mt-4 p-3 bg-slate-50 rounded-lg text-center border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Authorized Zone</p>
            <p className="text-sm font-black text-slate-800 uppercase">{currentPass?.department || 'General Facility'}</p>
          </div>
          
          <div className="w-full text-center mt-4">
            <p className="text-[8px] text-slate-400 uppercase tracking-widest">Valid until: {currentPass?.end_date ? new Date(currentPass.end_date).toLocaleDateString() : 'EOD'}</p>
          </div>
        </div>
      </div>

      {/* 💻 MAIN SCREEN DASHBOARD (Hidden on print) */}
      <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans print:hidden">
        
        {/* --- GLOBAL ACTION HEADER --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors mr-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 bg-slate-800 text-white rounded-lg shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Active Dossier</h1>
              <p className="text-xs text-slate-500 font-mono">TOKEN ID: {currentPass?.visit_id || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handlePrintBadge} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center shadow-sm">
              <Printer className="w-3.5 h-3.5 mr-2" /> Print ID Badge
            </button>
            {(displayStatus === 'Active' || displayStatus === 'Approved') && (
              <button onClick={() => setRevokeModal(true)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center shadow-sm">
                <UserMinus className="w-3.5 h-3.5 mr-2" /> Revoke Access
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT COLUMN: CORE IDENTITY & MATRIX (Span 2) --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* HERO SECTION */}
            <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                
                {/* ✅ REAL PROFILE PICTURE INJECTION */}
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-slate-400 font-black text-3xl shadow-inner shrink-0 overflow-hidden">
                  {visitor.visitor_photo_url ? (
                    <img src={visitor.visitor_photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    visitor.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{visitor.name}</h2>
                    <span className={`px-2.5 py-1 border text-[10px] font-black uppercase tracking-widest rounded-md ${displayStatus === 'Pending' ? 'animate-pulse' : ''} ${statusColor}`}>
                      {displayStatus}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-slate-400 font-medium">
                    <span className="flex items-center"><Building className="w-4 h-4 mr-1.5" /> {visitor.organization || 'Independent'}</span>
                    <span className="hidden sm:inline text-slate-700">•</span>
                    <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1.5" /> {visitor.designation || 'Visitor'}</span>
                  </div>

                  <div className="mt-5 inline-flex items-center gap-3 bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      CLEARANCE ZONE: {currentPass?.department?.toUpperCase() || 'GENERAL ACCESS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BENTO GRID: DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Box 1: Verified Dossier */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 mr-2 text-slate-500" /> Verified Dossier
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">{visitor.id_type || 'Govt ID'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{maskedId}</span>
                      <button onClick={() => setIsIdMasked(!isIdMasked)} className="focus:outline-none">
                        {isIdMasked ? <EyeOff className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" /> : <Eye className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700 transition-colors" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nationality</span>
                    <span className="font-medium text-slate-800 truncate max-w-[150px]" title={visitor.nationality}>{visitor.nationality || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Contact</span>
                    <span className="font-mono font-bold text-slate-800">{visitor.phone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="font-medium text-slate-800 truncate max-w-[150px]" title={visitor.email}>{visitor.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">DOB</span>
                    <span className="font-medium text-slate-800 truncate max-w-[150px]" title={visitor.dob}>{visitor.dob || 'N/A'}</span>
                  </div>
                </div>
              </div>


              {/* Box 2: Internal Sponsor */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center border-b border-slate-100 pb-2">
                  <ShieldCheck className="w-4 h-4 mr-2 text-slate-500" /> Internal Sponsor
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-100 shrink-0">
                    {(currentPass?.host?.name || 'UA').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-900 text-sm truncate">{currentPass?.host?.name || 'Unassigned'}</div>
                    <div className="text-[11px] text-slate-500 font-medium font-mono">{currentPass?.host_employee_id || 'Pending Host'}</div>
                  </div>
                </div>
                <button className="w-full py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-slate-600 text-xs font-bold rounded-lg transition-all flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 mr-2" /> Ping Host via Comms
                </button>
              </div>

              {/* Box 3: Compliance Checklist */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sm:col-span-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center border-b border-slate-100 pb-2">
                  <FileText className="w-4 h-4 mr-2 text-slate-500" /> Security Compliance Checklist
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900">ID Authenticated</div>
                      <div className="text-[10px] text-emerald-600 font-mono mt-0.5">Verified on file</div>
                    </div>
                  </div>
                  
                  {visitor.document_url || currentPass?.document_url ? (
                    <a href={visitor.document_url || currentPass?.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-emerald-50/50 hover:bg-emerald-100 transition-colors border border-emerald-100 rounded-xl cursor-pointer">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className="text-xs font-bold text-emerald-900">Credential Scans</div>
                        <div className="text-[10px] text-emerald-600 font-mono mt-0.5">Click to view log</div>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-rose-50/50 border border-rose-200 rounded-xl border-dashed">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      <div>
                        <div className="text-xs font-bold text-rose-900">Missing Scan</div>
                        <div className="text-[10px] text-rose-600 font-mono mt-0.5">No doc attached</div>
                      </div>
                    </div>
                  )}

                  <div className={`flex items-center gap-3 p-3 rounded-xl border-dashed ${currentPass?.actual_out ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
                    <Clock className={`w-5 h-5 ${currentPass?.actual_out ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <div>
                      <div className={`text-xs font-bold ${currentPass?.actual_out ? 'text-emerald-900' : 'text-amber-900'}`}>Exit Tracking</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${currentPass?.actual_out ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {currentPass?.actual_out ? 'Checkout Confirmed' : 'Pending physical exit'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* --- RIGHT COLUMN: FORENSIC TIMELINE (Span 1) --- */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[600px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-blue-600" /> Forensic History
              </h3>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-[10px] font-black text-slate-500 font-mono tracking-wide">{combinedTimeline.length} EVENTS</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 relative">
              <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-slate-100"></div>

              <div className="space-y-6 relative">
                {combinedTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center mt-10">No prior activity detected.</p>
                ) : (
                  combinedTimeline.map((log, index) => {
                    const isLatest = index === 0;
                    const formattedDate = log.dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    const formattedTime = log.dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    if (log.type === 'incident') {
                      // Incident UI (Red/Amber Alert)
                      const alertColor = log.status === 'Critical' ? 'bg-rose-500 border-rose-500' : 'bg-amber-500 border-amber-500';
                      return (
                        <div key={log.id + index} className={`flex gap-4 relative ${!isLatest ? 'opacity-80 hover:opacity-100 transition-opacity' : ''}`}>
                          <div className={`w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center shrink-0 z-10 shadow-sm mt-0.5 ${alertColor.split(' ')[1]}`}>
                            <AlertOctagon className={`w-3 h-3 text-${alertColor.split('-')[1]}-500`} />
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${log.status === 'Critical' ? 'text-rose-700' : 'text-amber-700'}`}>{log.title}</div>
                            <div className="text-[10px] text-slate-600 mt-1 leading-snug">{log.subtitle}</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-1">{formattedDate}, {formattedTime}</div>
                          </div>
                        </div>
                      )
                    }

                    // Standard Visit UI (Green/Blue/Gray)
                    const dotColor = 
                      log.status === 'Approved' || log.status === 'Cleared' || log.status === 'Completed' ? 'bg-emerald-500 border-emerald-500' :
                      log.status === 'Denied' || log.status === 'Revoked' ? 'bg-rose-500 border-rose-500' :
                      log.status === 'Active' ? 'bg-blue-500 border-blue-500' :
                      'bg-slate-500 border-slate-500';

                    return (
                      <div key={log.id + index} className={`flex gap-4 relative ${!isLatest ? 'opacity-70 hover:opacity-100 transition-opacity' : ''}`}>
                        <div className={`w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center shrink-0 z-10 shadow-sm mt-0.5 ${dotColor.split(' ')[1]}`}>
                          <div className={`w-2 h-2 rounded-full ${dotColor.split(' ')[0]}`}></div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{log.title}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">{formattedDate}, {formattedTime} • {log.subtitle}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <button onClick={() => navigate('/hr/audit')} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center">
                Query Security Ledgers <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

        </div>

        {/* --- BOTTOM SECTION: COMPLETE VISITATION LEDGER TABLE --- */}
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-slate-500" /> Complete Visitation Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Chronological breakdown of all logged visits, escorts, and purposes.</p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search purpose or Pass ID..." 
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">PASS ID</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">DATE & PIPELINE</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">PURPOSE</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">HOST</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">ESCORTS</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider">STATUS</th>
                  <th className="px-6 py-4 font-semibold text-xs tracking-wider text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">No historical records found matching your search.</td>
                  </tr>
                ) : (
                  filteredHistory.map((log) => {
                    const rowDate = new Date(log.start_date || log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    const escortCount = log.escorts?.length || 0;
                    
                    return (
                      <tr key={log.visit_id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-3 text-blue-600 font-mono font-bold text-xs">{log.visit_id}</td>
                        <td className="px-6 py-3">
                          <div className="text-slate-800 text-xs font-bold">{rowDate}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{log.visit_type}</div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs text-slate-600 line-clamp-1 max-w-[200px]" title={log.purpose}>{log.purpose || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-700 font-semibold">{log.host?.name || 'Unassigned'}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${escortCount > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {escortCount} CREW
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            log.status === 'Approved' || log.status === 'Cleared' || log.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            log.status === 'Denied' || log.status === 'Revoked' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                            'bg-amber-50 text-amber-600 border-amber-200'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button 
                            onClick={() => handleOpenVisitDetails(log)}
                            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-500 rounded-lg text-xs font-bold transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Review Log
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <VisitDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        visit={selectedVisitLog} 
      />

      {/* HR Emergency Revoke Modal */}
      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-rose-100 transform scale-100 transition-all">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
              <h3 className="font-black text-rose-800 flex items-center"><AlertOctagon className="w-5 h-5 mr-2"/> Revoke Clearance</h3>
              <button onClick={() => setRevokeModal(false)} className="text-rose-400 hover:text-rose-700 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-slate-600">This instantly flags the active pass, forces a checkout timestamp, and sends a Critical Forensic Alert to the security desk.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Reason for Revocation (Required)</label>
                <textarea autoFocus value={revokeReason} onChange={e => setRevokeReason(e.target.value)} rows={3} placeholder="e.g. Host cancelled meeting, Security concern..." className="w-full border-2 border-rose-100 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 bg-rose-50/30 resize-none transition-shadow"/>
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setRevokeModal(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-sm">Cancel</button>
                <button onClick={handleRevokeAccess} disabled={!revokeReason || isRevoking} className="flex-1 py-3 font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm disabled:opacity-50 transition-colors text-sm">
                  {isRevoking ? 'Revoking...' : 'Execute Revocation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}