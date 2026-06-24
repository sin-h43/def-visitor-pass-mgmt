import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UploadCloud, CheckCircle2, Globe, Search, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
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

// CHANGE: Added Interface for foreign profile data lookup
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

export default function AddVisitorForeignPage() {
  const navigate = useNavigate();

  // Form Process States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Operational Fields
  const [pipeline, setPipeline] = useState('New Visitor / Urgent Access');
  const [scheduledDate, setScheduledDate] = useState('');
  const [department, setDepartment] = useState('Research Wing');

  // CHANGE: Tracking token for existing profile linking
  const [visitorId, setVisitorId] = useState<string | null>(null);

  // Visitor Profile Metadata
  const [visitorName, setVisitorName] = useState('');
  const [gender, setGender] = useState('Others');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+1 ');
  const [nationality, setNationality] = useState('American');
  const [address, setAddress] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');
  const [purpose, setPurpose] = useState('');

  // Foreign National Specific Fields
  const [passportNumber, setPassportNumber] = useState('');
  const [visaNumber, setVisaNumber] = useState('');
  const [hostId, setHostId] = useState('');

  // CHANGE: Autocomplete state variables
  const [searchResults, setSearchResults] = useState<ExistingVisitor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Accompanying Contingent State
  const [headCount, setHeadCount] = useState<number>(0);
  const [escorts, setEscorts] = useState<{ name: string; govId: string }[]>([]);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadingText, setUploadingText] = useState('');
  
  // Calculate max allowed date for 12+ age requirement
  const maxAllowedDate = new Date();
  maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() - 12);
  const maxDob = maxAllowedDate.toISOString().split('T')[0];

  // CHANGE: Live debounce search against Supabase visitors table
  useEffect(() => {
    if (visitorName.trim().length < 2 || visitorId) {
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
  }, [visitorName, visitorId]);

  // CHANGE: Handler to map and autofill the selected foreign delegate profile
  const handleSelectVisitor = (visitor: ExistingVisitor) => {
    setVisitorId(visitor.visitor_id);
    setVisitorName(visitor.name);
    setGender(visitor.gender || 'Others');
    setDob(visitor.dob || '');
    setEmail(visitor.email || '');
    setPhone(visitor.phone || '+1 ');
    setAddress(visitor.address || '');
    setOrganization(visitor.organization || '');
    setDesignation(visitor.designation || '');
    setNationality(visitor.nationality || 'American');
    setPassportNumber(visitor.id_number || ''); // Maps the stored base ID directly to Passport
    
    setShowDropdown(false);
    if (pipeline !== 'Pre-Scheduled Visit') {
      setPipeline('Repeated Visitor');
    }
  };

  // CHANGE: Handler to reset back to a blank unregistered slate
  const handleClearSelectedVisitor = () => {
    setVisitorId(null);
    setVisitorName('');
    setGender('Others');
    setDob('');
    setEmail('');
    setPhone('+1 ');
    setAddress('');
    setOrganization('');
    setDesignation('');
    setNationality('American');
    setPassportNumber('');
    setPipeline('New Visitor / Urgent Access');
  };

  // Dynamically structure escort rows
  useEffect(() => {
    const count = Math.max(0, Math.min(headCount, 10));
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
      const newVisitId = `VST${timestamp}`;
      
      // CHANGE: Bind dynamic variable reference for tracking existing DB profiles
      let activeVisitorId = visitorId;

      let documentUrl = null;
      if (file) {
        setUploadingText('Uploading border scans...');
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
      
      setUploadingText('Saving international manifest...');

      // CHANGE: Wrapped insert logic in conditional. Only create new row if activeVisitorId is empty
      if (!activeVisitorId) {
        const standardGeneratedId = `VIS${timestamp}`;
        activeVisitorId = standardGeneratedId;

        const { error: visitorError } = await supabase.from('visitors').insert({
          visitor_id: standardGeneratedId,
          name: visitorName,
          email: email || null,
          phone: phone,
          gender: gender,
          dob: dob || null,
          address: address || null,
          id_type: 'Passport',
          id_number: passportNumber || 'Pending Verification',
          nationality: nationality,
          organization: organization || 'Global Delegation',
          designation: designation || 'International Delegate',
          department: department
        });

        if (visitorError) throw visitorError;
      }

      // Pack entry visa metrics into custom purpose string layout safely
      let finalPurpose = `[VISA REFERENCE ID: ${visaNumber}] ${purpose}`;
      if (escorts.length > 0) {
        const guestList = escorts.map(esc => `${esc.name} (ID: ${esc.govId})`).join(', ');
        finalPurpose += ` | Accompanying Guest Manifest: ${guestList}`;
      }

      const startDate = pipeline === 'Pre-Scheduled Visit' && scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString();

      // 2. Insert Visit Record (using linked or newly generated activeVisitorId)
      const { error: visitError } = await supabase.from('visits').insert({
        visit_id: newVisitId,
        visitor_id: activeVisitorId, // CHANGE: Mapped identifier
        host_employee_id: hostId || 'EMP001',
        created_by_employee_id: 'EMP001',
        visit_type: 'Foreign',
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
        navigate('/hr/visitormgmt');
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'System failed to register international tracking logs.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout role="hr" userName="Sinchana K">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 max-w-4xl shadow-sm text-center animate-fade-in mx-auto mt-10">
          <CheckCircle2 className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-800 mb-2">Border Entry Logged Successfully</h2>
          <p className="text-amber-600 font-medium">The international delegate profile maps have been securely created.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-4xl mx-auto pb-12 font-sans text-slate-800">
        
        {/* Navigation Return Row */}
        <div className="mb-6">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Clearance Ledger
          </button>
        </div>

        {/* Master Box Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-600" /> Foreign National Border Registry Terminal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Initialize international credential onboarding paths, visa clearance, and embassy tracks safely.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold">{error}</div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Context Pathway Controller */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/40 p-4 border border-amber-100/60 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">Processing Pipeline Track *</label>
                <select 
                  required value={pipeline} onChange={(e) => setPipeline(e.target.value)}
                  className="w-full p-2.5 border border-amber-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option>New Visitor / Urgent Access</option>
                  <option>Pre-Scheduled Visit</option>
                  <option>Repeated Visitor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">Target Destination Unit *</label>
                <select 
                  required value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 border border-amber-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Research Wing">Research Wing Operations</option>
                  <option value="IT Department">IT Department Systems</option>
                  <option value="Operations">Operations General Base</option>
                  <option value="Logistics">Logistics Division</option>
                </select>
              </div>
            </div>

            {pipeline === 'Pre-Scheduled Visit' && (
              <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl animate-fade-in">
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">Scheduled Arrival Timestamp Window Target *</label>
                <input required type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-xs font-bold font-mono text-slate-700 outline-none" />
              </div>
            )}

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Primary Base Identity</h4>

            {/* Core Identity Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* CHANGE: Converted Full Name input into an interactive search container matching the Amber theme */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Delegate Full Name *</label>
                <div className="relative flex items-center">
                  <input 
                    required 
                    type="text" 
                    value={visitorName} 
                    disabled={!!visitorId}
                    onChange={(e) => {
                      setVisitorName(e.target.value);
                      setShowDropdown(true);
                    }} 
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type name to lookup profiles..." 
                    className="w-full p-2.5 pr-8 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-600 font-semibold" 
                  />
                  {visitorId ? (
                    <button 
                      type="button" 
                      onClick={handleClearSelectedVisitor}
                      className="absolute right-2.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Clear profile layout"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                  )}
                </div>

                {/* Popover Matrix for Autocomplete Results */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((visitor) => (
                      <div 
                        key={visitor.visitor_id}
                        onClick={() => handleSelectVisitor(visitor)}
                        className="px-4 py-2.5 text-xs text-slate-700 hover:bg-amber-50/70 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{visitor.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{visitor.email || 'No email registered'}</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold font-mono">
                          Passport: {visitor.id_number || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {visitorId && (
                  <span className="text-[10px] text-amber-600 font-bold mt-1 block">
                    ✓ Linked international profile verified.
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
                  <select value={gender} disabled={!!visitorId} onChange={(e) => setGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-amber-500 disabled:bg-slate-50">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Others">Others</option>
                  </select>
                </div>                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality *</label>
                  <select value={nationality} disabled={!!visitorId} onChange={handleNationalityChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-amber-500 disabled:bg-slate-50">
                    {NATIONALITIES.map(nat => (
                      <option key={nat.label} value={nat.label}>{nat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone *</label>
                  <input required type="tel" value={phone} disabled={!!visitorId} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-amber-500 disabled:bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
                <input type="date" value={dob} disabled={!!visitorId} max={maxDob} onChange={(e) => setDob(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:border-amber-500 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Secure Email Address</label>
                <input type="email" value={email} disabled={!!visitorId} onChange={(e) => setEmail(e.target.value)} placeholder="delegate@domain.com" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 disabled:bg-slate-50" />
              </div>
            </div>

            {/* DYNAMIC AMBER PASSPORT SUBSECTION PANEL */}
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Security & Track Verification</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/20 p-4 border border-amber-100 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Passport Document Serial ID *</label>
                {/* CHANGE: Passport disabled if linked, as it's permanent profile data */}
                <input required type="text" value={passportNumber} disabled={!!visitorId} onChange={(e) => setPassportNumber(e.target.value)} placeholder="Enter Passport Serial Number" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono tracking-wider outline-none focus:ring-2 focus:ring-amber-500 uppercase disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Visa Tracking Clearance Number *</label>
                {/* CHANGE: Visa Number remains active, as visa authorizations change per visit trip */}
                <input required type="text" value={visaNumber} onChange={(e) => setVisaNumber(e.target.value)} placeholder="Enter Visa Entry Control ID" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono tracking-wider outline-none focus:ring-2 focus:ring-amber-500 uppercase" />
              </div>
            </div>

            {/* Background Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Representing Global Organization</label>
                <input type="text" value={organization} disabled={!!visitorId} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. United Nations Embassy Unit" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Official Rank / Designation</label>
                <input type="text" value={designation} disabled={!!visitorId} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Diplomatic Counsel Envoy" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 disabled:bg-slate-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Domestic Sponsor Personnel ID *</label>
                <input required type="text" value={hostId} onChange={(e) => setHostId(e.target.value)} placeholder="e.g. EMP001" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-amber-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">International Terminal Address</label>
                <input type="text" value={address} disabled={!!visitorId} onChange={(e) => setAddress(e.target.value)} placeholder="Consulate Suite No, Hotel Complex, City..." className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 disabled:bg-slate-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Purpose Statement of International Dispatch *</label>
                <input required type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="State international strategic visit goals explicitly..." className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500" />
              </div>
            </div>

            {/* Escorts Group Block */}
            <div className="border border-slate-200 rounded-xl bg-slate-50/40 overflow-hidden mt-2">
              <div className="p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 flex items-center uppercase tracking-wide"><Users className="w-4 h-4 mr-1.5 text-slate-500" />Accompanying Crew Head Count</label>
                </div>
                <input type="number" min="0" max="10" value={headCount || ''} onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)} placeholder="0 (Single Personnel)" className="w-full sm:w-40 p-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-bold text-center focus:border-amber-500" />
              </div>

              {escorts.length > 0 && (
                <div className="p-4 bg-white space-y-3.5">
                  {escorts.map((escort, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 relative">
                      <div className="absolute -left-2 -top-2 w-5 h-5 bg-amber-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-sm">{index + 1}</div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Member Full Name</label>
                        <input required type="text" value={escort.name} onChange={(e) => handleEscortChange(index, 'name', e.target.value)} placeholder="Enter name" className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium outline-none focus:border-amber-500" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Passport Document Serial ID</label>
                        <input required type="text" value={escort.govId} onChange={(e) => handleEscortChange(index, 'govId', e.target.value)} placeholder="Enter Passport Serial" className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-bold font-mono outline-none focus:border-amber-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Scans */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Verification Scan Credentials Copy</label>
              
              <label className="border-2 border-dashed border-amber-200 rounded-xl p-6 bg-slate-50/60 flex flex-col items-center justify-center text-slate-400 hover:bg-amber-50/10 hover:border-amber-400 transition-all cursor-pointer relative">
                <UploadCloud className="w-7 h-7 mb-1.5 text-amber-600" />
                <span className="font-bold text-amber-900 text-xs">
                  {file ? (file as File).name : 'Click to Upload Passport Scans copy'}
                </span>
                <span className="text-[10px] mt-0.5 text-slate-400">PDF or Image logs up to 5MB</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>

              {/* Action Triggers */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
                <button type="button" onClick={() => navigate('/hr/visitormgmt')} className="px-5 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-100 transition-colors text-xs">
                  Cancel Registry
                </button>
                <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all text-xs disabled:opacity-50 flex items-center">
                  {loading ? (uploadingText || 'Processing parameters...') : 'Commit Application'}
                </button>
              </div>
            </div>

          </form>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </DashboardLayout>
  );
}