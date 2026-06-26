import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UploadCloud, Users, AlertCircle, CheckCircle2, Search, X } from 'lucide-react';
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

interface ExistingVisitor {
  visitor_id: string;
  name: string;
  gender: string;
  dob: string;
  email: string;
  phone: string;
  id_type: string;
  id_number: string;
  address: string;
  organization: string;
  designation: string;
  nationality: string;
}

interface EscortPersonnel {
  name: string;
  idType: string;
  govId: string;
  email: string;
  nationality: string;
  phone: string;
  gender: string;
}

export default function RegistrationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state?.autofill;
  
  const isEdit = location.state?.isEdit; 
  const existingVisitId = prefillData?.id;

  // Form Process States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Field Target Operations
  const [pipeline, setPipeline] = useState(prefillData?.pipeline === 'Pre-Scheduled' ? 'Pre-Scheduled Visit' : (prefillData?.pipeline === 'Repeated' ? 'Repeated Visitor' : 'New Visitor / Urgent Access'));
  const [scheduledDate, setScheduledDate] = useState('');
  const [department, setDepartment] = useState(prefillData?.department || 'Research Wing');

  // Visitor Core Identity Attributes
  const [visitorId, setVisitorId] = useState<string | null>(null); 
  const [visitorName, setVisitorName] = useState(prefillData?.visitorName || '');
  const [gender, setGender] = useState(prefillData?.gender && prefillData.gender !== 'Others' ? prefillData.gender : 'Others');
  const [dob, setDob] = useState(prefillData?.dob !== 'N/A' ? (prefillData?.dob || '') : '');
  const [email, setEmail] = useState(prefillData?.email !== 'N/A' ? (prefillData?.email || '') : '');
  const [phone, setPhone] = useState(prefillData?.phone !== 'N/A' ? (prefillData?.phone || '+91 ') : '+91 ');
  const [idType, setIdType] = useState(prefillData?.id_type || 'PAN');
  const [idNumber, setIdNumber] = useState(prefillData?.id_number !== 'N/A' ? (prefillData?.id_number || '') : '');
  const [address, setAddress] = useState(prefillData?.address !== 'N/A' ? (prefillData?.address || '') : '');
  
  const [purpose, setPurpose] = useState(() => {
    if (prefillData?.purpose) return prefillData.purpose.split(' | Accompanying:')[0];
    return '';
  });
  
  const [organization, setOrganization] = useState(prefillData?.organization !== 'N/A' ? (prefillData?.organization || '') : '');
  const [designation, setDesignation] = useState('');
  const [nationality, setNationality] = useState(prefillData?.nationality || 'Indian');

  // Autofill Synchronization Hook
  useEffect(() => {
    if (prefillData) {
      if (prefillData.designation && prefillData.designation !== 'N/A') {
        setDesignation(prefillData.designation);
      }
      
      if (prefillData.requestDate && prefillData.pipeline === 'Pre-Scheduled') {
        try {
          const [datePart, timePart] = prefillData.requestDate.split(', ');
          const [day, month, year] = datePart.split('/');
          const formattedIso = `${year}-${month}-${day}T${timePart.substring(0, 5)}`;
          setScheduledDate(formattedIso);
        } catch (e) {
          console.error("Failed to format pre-scheduled entry date parameter", e);
        }
      }
    }
  }, [prefillData]);
  
  // Autocomplete UI States
  const [searchResults, setSearchResults] = useState<ExistingVisitor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Accompanying Contingent State
  const [headCount, setHeadCount] = useState<number>(prefillData?.escorts?.length || 0);
const [escorts, setEscorts] = useState<EscortPersonnel[]>(
  prefillData?.escorts?.map((e: any) => ({ 
    name: e.name || '', 
    idType: e.idType || e.id_type || 'PAN',
    govId: e.govId || e.id_number || e.gov_id || '',  
    email: e.email || '', 
    nationality: e.nationality || 'Indian', 
    phone: e.phone || '', 
    gender: e.gender || 'Others' 
  })) || []
);

  // File Asset Tokens
  const [file, setFile] = useState<File | null>(null);
  const [uploadingText, setUploadingText] = useState('');

  // 12+ Age Requirement Calculator
  const maxAllowedDate = new Date();
  maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() - 12);
  const maxDob = maxAllowedDate.toISOString().split('T')[0];

  useEffect(() => {
    if (visitorName.trim().length < 2 || visitorId || isEdit) {
      setSearchResults([]);
      return;
    }

    const searchVisitors = async () => {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .ilike('name', `%${visitorName}%`)
        .limit(5);

      if (!error && data) {
        setSearchResults(data as ExistingVisitor[]);
      }
    };

    const debounceTimer = setTimeout(searchVisitors, 300);
    return () => clearTimeout(debounceTimer);
  }, [visitorName, visitorId, isEdit]);

  const handleSelectVisitor = (visitor: ExistingVisitor) => {
    setVisitorId(visitor.visitor_id);
    setVisitorName(visitor.name);
    setGender(visitor.gender || 'Others');
    setDob(visitor.dob || '');
    setEmail(visitor.email || '');
    setPhone(visitor.phone || '+91 ');
    setIdType(visitor.id_type || 'Aadhar');
    setIdNumber(visitor.id_number || '');
    setAddress(visitor.address || '');
    setOrganization(visitor.organization || '');
    setDesignation(visitor.designation || '');
    setNationality(visitor.nationality || 'Indian');
    setShowDropdown(false);
    
    if (pipeline !== 'Pre-Scheduled Visit') {
      setPipeline('Repeated Visitor');
    }
  };

  const handleClearSelectedVisitor = () => {
    setVisitorId(null);
    setVisitorName('');
    setGender('Others');
    setDob('');
    setEmail('');
    setPhone('+91 ');
    setIdType('Aadhar');
    setIdNumber('');
    setAddress('');
    setOrganization('');
    setDesignation('');
    setNationality('Indian');
    setPipeline('New Visitor / Urgent Access');
  };

useEffect(() => {
  const count = Math.max(0, Math.min(headCount, 10));
  setEscorts(prev => {
    const newEscorts = [...prev];
    if (count > prev.length) {
      for (let i = prev.length; i < count; i++) {
        // Enforce safe default initialization fields per escort block
        newEscorts.push({ 
          name: '', 
          idType: 'PAN', 
          govId: '', 
          email: '', 
          phone: '', 
          nationality: 'Indian', 
          gender: 'Others' 
        });
      }
    } else {
      newEscorts.length = count;
    }
    return newEscorts;
  });
}, [headCount]);

  const handleEscortChange = (index: number, field: keyof EscortPersonnel, value: string) => {
    const updatedEscorts = [...escorts];
    updatedEscorts[index] = {
      ...updatedEscorts[index],
      [field]: value
    };
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
      const activeVisitId = isEdit ? existingVisitId : `VST${timestamp}`;
      let activeVisitorId = visitorId;

      let documentUrl = prefillData?.documentUrl || null;
      if (file) {
        setUploadingText('Uploading document binary...');
        const fileExt = file.name.split('.').pop();
        const fileName = `${activeVisitId}_doc_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('visitor-documents').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('visitor-documents').getPublicUrl(fileName);
        documentUrl = publicUrlData.publicUrl;
      }
      
      setUploadingText(isEdit ? 'Updating corrected records...' : 'Committing secure records...');

      if (isEdit && !activeVisitorId) {
        const { data: vData } = await supabase.from('visits').select('visitor_id').eq('visit_id', existingVisitId).single();
        if (vData) activeVisitorId = vData.visitor_id;
      }

      let finalPurpose = purpose;
      if (escorts.length > 0) {
        const guestList = escorts.map(esc => `${esc.name} (${esc.idType}: ${esc.govId})`).join(', ');
        finalPurpose += ` | Accompanying: ${guestList}`;
      }
      const dbVisitType = pipeline === 'Pre-Scheduled Visit' ? 'PRESCHEDULED' : (pipeline === 'Repeated Visitor' ? 'REPEATED' : 'IMMEDIATE');
      const startDate = pipeline === 'Pre-Scheduled Visit' && scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString();

      if (isEdit) {
        if (activeVisitorId) {
          await supabase.from('visitors').update({
            name: visitorName, email: email || null, phone: phone, gender: gender || 'Others',
            dob: dob || null, address: address || null, id_type: idType, id_number: idNumber || 'Pending',
            nationality: nationality, organization: organization || null, designation: designation || null, department: department || null
          }).eq('visitor_id', activeVisitorId);
        }

        const { error: updateError } = await supabase.from('visits').update({
          visit_type: dbVisitType, purpose: finalPurpose, start_date: startDate, end_date: startDate,
          status: 'Pending', hr_remarks: null, department: department,
          ...(documentUrl && { document_url: documentUrl })
        }).eq('visit_id', activeVisitId);

        if (updateError) throw updateError;

      } else {
        if (!activeVisitorId) {
          const standardGeneratedId = `VIS${timestamp}`;
          activeVisitorId = standardGeneratedId;
          const { error: visitorError } = await supabase.from('visitors').insert({
            visitor_id: standardGeneratedId, name: visitorName, email: email || null, phone: phone,
            gender: gender || 'Others', dob: dob || null, address: address || null, id_type: idType,
            id_number: idNumber || 'Pending', nationality: nationality, organization: organization || null,
            designation: designation || null, department: department || null
          });
          if (visitorError) throw visitorError;
        }

        const { error: visitError } = await supabase.from('visits').insert({
          visit_id: activeVisitId, visitor_id: activeVisitorId, host_employee_id: 'EMP001', created_by_employee_id: 'EMP001',
          visit_type: dbVisitType, pass_type: 'ONE_DAY', purpose: finalPurpose, start_date: startDate, end_date: startDate,
          status: 'Pending', document_url: documentUrl
        });
        if (visitError) throw visitError;
      }

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
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">
          {isEdit ? 'Request Successfully Resent' : 'Clearance Registration Successful'}
        </h2>
        <p className="text-emerald-600 font-medium">The identity matrix and entry pass have been securely routed.</p>
        <p className="text-xs text-emerald-400 mt-4 font-mono">Routing back to Terminal Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-4xl shadow-sm font-sans text-slate-800">
      <div className="border-b border-slate-100 pb-4 mb-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          {isEdit ? 'Correct & Resend Application' : 'Security Access Registry Form'}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {isEdit ? 'Fix any errors flagged by HR and resubmit this request for review.' : 'Complete all required deployment identity fields to formulate access pass authorizations.'}
        </p>
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
              required value={pipeline} onChange={(e) => setPipeline(e.target.value)}
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
              required value={department} onChange={(e) => setDepartment(e.target.value)}
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
              required type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full p-2.5 border border-blue-200 rounded-lg bg-white text-xs font-bold font-mono text-slate-700 outline-none" 
            />
          </div>
        )}

        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Primary Base Identity</h4>

        {/* Primary Identity Section Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Autocomplete Name Field */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name *</label>
            <div className="relative flex items-center">
              <input 
                required type="text" value={visitorName} disabled={!!visitorId || isEdit}
                onChange={(e) => { setVisitorName(e.target.value); setShowDropdown(true); }} 
                onFocus={() => setShowDropdown(true)} placeholder="Type name to lookup profiles..." 
                className="w-full p-2.5 pr-8 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-600 font-semibold" 
              />
              {visitorId && !isEdit ? (
                <button type="button" onClick={handleClearSelectedVisitor} className="absolute right-2.5 text-slate-400 hover:text-red-500 transition-colors" title="Clear profile layout">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              )}
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((visitor) => (
                  <div key={visitor.visitor_id} onClick={() => handleSelectVisitor(visitor)} className="px-4 py-2.5 text-xs text-slate-700 hover:bg-blue-50/70 cursor-pointer flex justify-between items-center transition-colors">
                    <div>
                      <span className="font-bold text-slate-900 block">{visitor.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{visitor.email || 'No email registered'}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold font-mono">
                      {visitor.id_type}: {visitor.id_number}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
              <select value={gender} disabled={!!visitorId && !isEdit} onChange={(e) => setGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-blue-500 disabled:bg-slate-50">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality *</label>
              <select value={nationality} disabled={!!visitorId && !isEdit} onChange={handleNationalityChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-blue-500 disabled:bg-slate-50">
                {NATIONALITIES.map(nat => (
                  <option key={nat.label} value={nat.label}>{nat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone *</label>
              <input required type="tel" value={phone} disabled={!!visitorId && !isEdit} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-blue-500 disabled:bg-slate-50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
            <input 
              type="date" 
              value={dob} 
              disabled={!!visitorId && !isEdit} 
              max={maxDob}
              onChange={(e) => setDob(e.target.value)} 
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
            <input type="email" value={email} disabled={!!visitorId && !isEdit} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. name@domain.com" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 disabled:bg-slate-50" />
          </div>

          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ID Type *</label>
              <select value={idType} disabled={!!visitorId && !isEdit} onChange={(e) => setIdType(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-blue-500 disabled:bg-slate-50">
                <option value="PAN">PAN Card</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Govt Issued ID Number *</label>
              <input required type="text" value={idNumber} disabled={!!visitorId && !isEdit} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter Document ID Number" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono uppercase tracking-wider outline-none focus:border-blue-500 disabled:bg-slate-50" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Permanent Address</label>
            <input type="text" value={address} disabled={!!visitorId && !isEdit} onChange={(e) => setAddress(e.target.value)} placeholder="House/Office No, Street, City, State, Pincode" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 disabled:bg-slate-50" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Organization / Employer</label>
            <input type="text" value={organization} disabled={!!visitorId && !isEdit} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. Acme Corp Operations" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 disabled:bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Designation</label>
            <input type="text" value={designation} disabled={!!visitorId && !isEdit} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Technical Director" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 disabled:bg-slate-50" />
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
            </div>
            <input 
              type="number" min="0" max="10" value={headCount || ''} onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)}
              placeholder="0 (Single Personnel)" className="w-full sm:w-40 p-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-bold text-center focus:border-blue-500" 
            />
          </div>

          {escorts.length > 0 && (
            <div className="p-4 bg-white space-y-3.5">
              {escorts.map((escort, index) => (
                <div key={index} className="flex flex-col gap-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 relative">
                  <div className="absolute -left-2 -top-2 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-sm">
                    {index + 1}
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full">
                    
                    {/* FIRST ROW: Name, Gender, Nationality, Contact Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                      <div className='sm:col-span-2'>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Member Full Name *</label>
                        <input 
                          required
                          type="text" 
                          value={escort.name}
                          onChange={(e) => handleEscortChange(index, 'name', e.target.value)}
                          placeholder="Enter name" 
                          className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium outline-none focus:border-blue-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Gender *</label>
                        <select 
                          value={escort.gender} 
                          onChange={(e) => handleEscortChange(index, 'gender', e.target.value)} 
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nationality *</label>
                        <select 
                          value={escort.nationality} 
                          onChange={(e) => handleEscortChange(index, 'nationality', e.target.value)} 
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500"
                        >
                          {NATIONALITIES.map(nat => (
                            <option key={nat.label} value={nat.label}>{nat.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Contact Phone *</label>
                        <input 
                          required 
                          type="tel" 
                          value={escort.phone} 
                          onChange={(e) => handleEscortChange(index, 'phone', e.target.value)} 
                          placeholder="+91 98765 43210" 
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500" 
                        />
                      </div>
                    </div>

                    {/* SECOND ROW: ID Type, ID Number & Email Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">ID Type *</label>
                        <select 
                          value={escort.idType} 
                          onChange={(e) => handleEscortChange(index, 'idType', e.target.value)} 
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500"
                        >
                          <option value="Aadhar">Aadhar</option>
                          <option value="PAN">PAN Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                          <option value="Voter ID">Voter ID</option>
                        </select>
                      </div>

                      <div>
  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
    {escort.idType} Serial ID *
  </label>
  <input 
    required
    type="text" 
    value={escort.govId}
    onChange={(e) => handleEscortChange(index, 'govId', e.target.value)}
    placeholder={`Enter ${escort.idType} Number`} 
    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold font-mono uppercase tracking-wider outline-none focus:border-blue-500" 
  />
</div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
                        <input 
                          type="email" 
                          value={escort.email}
                          onChange={(e) => handleEscortChange(index, 'email', e.target.value)}
                          placeholder="e.g. name@domain.com" 
                          className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium outline-none focus:border-blue-500" 
                        />
                      </div>
                    </div>

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
            {prefillData?.documentUrl && !file && (
              <span className="text-[10px] text-blue-500 mt-1 font-bold">Existing document attached. Click to replace.</span>
            )}
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
            <button type="button" onClick={() => navigate('/emp')} className="px-5 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl font-bold bg-slate-950 text-white hover:bg-slate-900 shadow-sm transition-all text-xs disabled:opacity-50 flex items-center">
              {loading ? (uploadingText || 'Processing...') : (isEdit ? 'Update & Resend Application' : 'Commit Application')}
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