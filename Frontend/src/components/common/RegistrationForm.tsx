import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UploadCloud, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const NATIONALITIES = [
  { label: 'Indian', code: '+91' },
  { label: 'American', code: '+1' },
  { label: 'British', code: '+44' },
  { label: 'Canadian', code: '+1' },
  { label: 'Australian', code: '+61' },
  { label: 'Singaporean', code: '+65' },
  { label: 'Japanese', code: '+81' },
  { label: 'German', code: '+49' },
  { label: 'French', code: '+33' },
  { label: 'Other', code: '' }
];

export default function RegistrationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state?.autofill;

  // Form Process States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Field Target Operations
  const [pipeline, setPipeline] = useState(prefillData?.pipeline === 'Pre-Scheduled' ? 'Pre-Scheduled Visit' : 'New Visitor / Urgent Access');
  const [scheduledDate, setScheduledDate] = useState('');
  const [department, setDepartment] = useState('Research Wing');

  // Visitor Core Identity Attributes
  const [visitorName, setVisitorName] = useState(prefillData?.visitorName || '');
  const [gender, setGender] = useState(prefillData?.gender && prefillData.gender !== 'Others' ? prefillData.gender : 'Others');
  const [dob, setDob] = useState(prefillData?.dob !== 'N/A' ? (prefillData?.dob || '') : '');
  const [email, setEmail] = useState(prefillData?.email !== 'N/A' ? (prefillData?.email || '') : '');
  const [phone, setPhone] = useState(prefillData?.phone !== 'N/A' ? (prefillData?.phone || '+91 ') : '+91 ');
  const [idType, setIdType] = useState(prefillData?.id_type || 'PAN');
  const [idNumber, setIdNumber] = useState(prefillData?.id_number !== 'N/A' ? (prefillData?.id_number || '') : '');
  const [address, setAddress] = useState(prefillData?.address !== 'N/A' ? (prefillData?.address || '') : '');
  const [purpose, setPurpose] = useState(prefillData?.purpose || '');
  const [organization, setOrganization] = useState(prefillData?.organization !== 'N/A' ? (prefillData?.organization || '') : '');
  const [designation, setDesignation] = useState('');
  const [nationality, setNationality] = useState('Indian');

  // Accompanying Contingent State
  const [headCount, setHeadCount] = useState<number>(0);
  const [escorts, setEscorts] = useState<{name: string, govId: string}[]>([]);

  // File Asset Tokens
  const [file, setFile] = useState<File | null>(null);
  const [uploadingText, setUploadingText] = useState('');

  // Dynamically structuralize escort rows based on quantitative input limits
  useEffect(() => {
    const count = Math.max(0, Math.min(headCount, 10)); // Caps rows at 10 to protect DOM performance
    setEscorts(prev => {
      const newEscorts = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          newEscorts.push({ name: '', govId: '' });
        }
      } else {
        newEscorts.length = count;
      }
      return newEscorts;
    });
  }, [headCount]);

  const handleEscortChange = (index: number, field: 'name' | 'govId', value: string) => {
    const updatedEscorts = [...escorts];
    updatedEscorts[index][field] = value;
    setEscorts(updatedEscorts);
  };

  const handleNationalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedNat = e.target.value;
    setNationality(selectedNat);
    const natData = NATIONALITIES.find(n => n.label === selectedNat);
    if (natData && natData.code) {
      setPhone(`${natData.code} `);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now().toString().slice(-6);
      const newVisitorId = `VIS${timestamp}`;
      const newVisitId = `VST${timestamp}`;

      let documentUrl = null;
      if (file) {
        setUploadingText('Uploading document binary...');
        const fileExt = file.name.split('.').pop();
        const fileName = `${newVisitId}_doc.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('visitor-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('visitor-documents')
          .getPublicUrl(fileName);
          
        documentUrl = publicUrlData.publicUrl;
      }
      
      setUploadingText('Committing secure records...');

      // 1. Insert transaction row into visitors base table
      const { error: visitorError } = await supabase.from('visitors').insert({
        visitor_id: newVisitorId,
        name: visitorName,
        email: email || null,
        phone: phone,
        gender: gender || 'Others',
        dob: dob || null,
        address: address || null,
        id_type: idType,
        id_number: idNumber || 'Pending',
        nationality: nationality,
        organization: organization || null,
        designation: designation || null,
        department: department || null
      });

      if (visitorError) throw visitorError;

      // Bundle context records cleanly into the purpose column string
      let finalPurpose = purpose;
      if (escorts.length > 0) {
        const guestList = escorts.map(esc => `${esc.name} (ID: ${esc.govId})`).join(', ');
        finalPurpose += ` | Accompanying: ${guestList}`;
      }

      const dbVisitType = pipeline === 'Pre-Scheduled Visit' ? 'PRESCHEDULED' : (pipeline === 'Repeated Visitor' ? 'REPEATED' : 'IMMEDIATE');
      const startDate = pipeline === 'Pre-Scheduled Visit' && scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString();

      // 2. Insert transaction row into visits mapping table
      const { error: visitError } = await supabase.from('visits').insert({
        visit_id: newVisitId,
        visitor_id: newVisitorId,
        host_employee_id: 'EMP001', // Standard hardcoded testing anchor
        created_by_employee_id: 'EMP001',
        visit_type: dbVisitType,
        pass_type: 'ONE_DAY',
        purpose: finalPurpose,
        start_date: startDate,
        end_date: startDate,
        status: 'Pending',
        document_url: documentUrl
      });

      if (visitError) throw visitError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/emp');
      }, 2000);

    } catch (err: any) {
      console.error('Registration Transaction Failure:', err);
      setError(err.message || 'System failed to securely process core entry clearance.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 max-w-4xl shadow-sm text-center animate-fade-in mx-auto mt-10">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">Clearance Registration Successful</h2>
        <p className="text-emerald-600 font-medium">The identity matrix and entry pass have been securely logged.</p>
        <p className="text-xs text-emerald-400 mt-4 font-mono">Routing back to Terminal Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-4xl shadow-sm font-sans text-slate-800">
      <div className="border-b border-slate-100 pb-4 mb-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security Access Registry Form</h2>
        <p className="text-xs text-slate-400 mt-0.5">Complete all required deployment identity fields to formulate access pass authorizations.</p>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center shadow-inner">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        
        {/* Processing Configuration Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pass Processing Pipeline *</label>
            <select 
              required
              value={pipeline}
              onChange={(e) => setPipeline(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>New Visitor / Urgent Access</option>
              <option>Pre-Scheduled Visit</option>
              <option>Repeated Visitor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Destination Unit *</label>
            <select 
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Research Wing">Research Wing</option>
              <option value="IT Department">IT Department</option>
              <option value="Operations">Operations</option>
              <option value="Logistics">Logistics</option>
              <option value="HR Department">HR Department</option>
            </select>
          </div>
        </div>

        {pipeline === 'Pre-Scheduled Visit' && (
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl animate-fade-in">
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1.5">Requested Arrival Window Target *</label>
            <input 
              required
              type="datetime-local" 
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full p-2.5 border border-blue-200 rounded-lg bg-white text-xs font-bold font-mono text-slate-700 outline-none" 
            />
          </div>
        )}

        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Primary Base Identity</h4>

        {/* Primary Identity Section Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name *</label>
            <input required type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} placeholder="e.g. Rahul Verma" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500" />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-blue-500">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality *</label>
              <select value={nationality} onChange={handleNationalityChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-blue-500">
                {NATIONALITIES.map(nat => (
                  <option key={nat.label} value={nat.label}>{nat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone *</label>
              <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. name@domain.com" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ID Type *</label>
              <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-blue-500">
                <option value="PAN">PAN Card</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Govt Issued ID Number *</label>
              <input required type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter Document ID Number" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono uppercase tracking-wider outline-none focus:border-blue-500" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Permanent Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House/Office No, Street, City, State, Pincode" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Organization / Employer</label>
            <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. Acme Corp Operations" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Designation</label>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Technical Director" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Detailed Purpose of Entry *</label>
            <input required type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Scheduled Corporate Infrastructure Support Sync" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Accompanying Escort Section Layout */}
        <div className="border border-slate-200 rounded-xl bg-slate-50/40 overflow-hidden mt-2">
          <div className="p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 flex items-center uppercase tracking-wide">
                <Users className="w-4 h-4 mr-1.5 text-slate-500" />
                Accompanying Contingent Head Count
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">Specify companion additions processing entry authorization bounds.</p>
            </div>
            <input 
              type="number" 
              min="0"
              max="10"
              value={headCount || ''}
              onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)}
              placeholder="0 (Single Personnel)" 
              className="w-full sm:w-40 p-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-bold text-center focus:border-blue-500" 
            />
          </div>

          {escorts.length > 0 && (
            <div className="p-4 bg-white space-y-3.5">
              <div className="text-[10px] font-bold text-amber-700 bg-amber-50/60 border border-amber-200 px-2.5 py-1 rounded w-fit uppercase tracking-wider">
                Group Manifest Tracking: {escorts.length} profiles required.
              </div>
              
              {escorts.map((escort, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 relative">
                  <div className="absolute -left-2 -top-2 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Member Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={escort.name}
                      onChange={(e) => handleEscortChange(index, 'name', e.target.value)}
                      placeholder="Enter name" 
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Identification Serial ID</label>
                    <input 
                      required
                      type="text" 
                      value={escort.govId}
                      onChange={(e) => handleEscortChange(index, 'govId', e.target.value)}
                      placeholder="Enter Serial ID" 
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-bold font-mono outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Media Upload Section */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Verification Document Scans</label>
          
          <label className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/60 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100/50 transition-colors cursor-pointer relative">
            <UploadCloud className="w-7 h-7 mb-1.5 text-blue-500" />
            <span className="font-bold text-slate-700 text-xs">
              {file ? (file as File).name : 'Upload Authorization Credentials'}
            </span>
            <span className="text-[10px] mt-0.5 text-slate-400">PDF, PNG, or JPG formats up to 5MB</span>
            
            <input 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>

          {/* Action Submission Trigger Controls */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
            <button type="button" onClick={() => navigate('/emp')} className="px-5 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl font-bold bg-slate-950 text-white hover:bg-slate-900 shadow-sm transition-all text-xs disabled:opacity-50 flex items-center">
              {loading ? (uploadingText || 'Processing...') : 'Commit Application'}
            </button>
          </div>
        </div>
      </form>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}