
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft,Users, UploadCloud, CheckCircle2, Wrench, Search, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';

const NATIONALITIES = [
  { label: 'Indian', code: '+91' }
];

// CHANGE: Added interface for existing vendor profiles
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

export default function AddVisitorServicePage() {
  const navigate = useNavigate();

  // Form Process States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Operational Fields
  const [pipeline, setPipeline] = useState('New Visitor / Urgent Access');
  const [scheduledDate, setScheduledDate] = useState('');
  const [department, setDepartment] = useState('Operations');

  // CHANGE: Tracking state to distinguish between a linked existing vendor vs a brand new one
  const [visitorId, setVisitorId] = useState<string | null>(null);

  // Visitor Profile Metadata
  const [visitorName, setVisitorName] = useState('');
  const [gender, setGender] = useState('Others');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [nationality, setNationality] = useState('Indian');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('');

  // Service Specific Fields
  const [contractingCompany, setContractingCompany] = useState('');
  const [tradeType, setTradeType] = useState('Facilities Maintenance');
  const [idType, setIdType] = useState('Business Vendor ID');
  const [idNumber, setIdNumber] = useState('');
  const [hostId, setHostId] = useState('');

  // CHANGE: Autocomplete state nodes for displaying the floating dropdown search matrix
  const [searchResults, setSearchResults] = useState<ExistingVisitor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Accompanying Contingent State
  const [headCount, setHeadCount] = useState<number>(0);
  const [escorts, setEscorts] = useState<{name: string, govId: string, email:string, nationality:string, phone: string, gender:string}[]>([]);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadingText, setUploadingText] = useState('');

    // Calculate max allowed date for 12+ age requirement
  const maxAllowedDate = new Date();
  maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() - 12);
  const maxDob = maxAllowedDate.toISOString().split('T')[0];


  // CHANGE: Debounced layout hook to watch the technician's name input and execute search
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

  // CHANGE: Selection handler mapping to automatically fill base profile blocks and lock inputs
  const handleSelectVisitor = (visitor: ExistingVisitor) => {
    setVisitorId(visitor.visitor_id);
    setVisitorName(visitor.name);
    setGender(visitor.gender || 'Others');
    setDob(visitor.dob || '');
    setEmail(visitor.email || '');
    setPhone(visitor.phone || '+91 ');
    setAddress(visitor.address || '');
    
    // Map existing organization and designation data to vendor-specific fields
    setContractingCompany(visitor.organization || '');
    setTradeType(visitor.designation || 'Facilities Maintenance');
    setNationality(visitor.nationality || 'Indian');
    
    // Autofill vendor verification credentials if they match our dropdown parameters
    if (visitor.id_type && ['Business Vendor ID', 'Labor Token Certificate', 'PAN Clearance Card'].includes(visitor.id_type)) {
      setIdType(visitor.id_type);
    }
    setIdNumber(visitor.id_number || '');
    
    setShowDropdown(false);
    if (pipeline !== 'Pre-Scheduled Visit') {
      setPipeline('Repeated Visitor');
    }
  };

  // CHANGE: Cleanup reset handler if the HR admin needs to break out of a linked profile to add a new contractor
  const handleClearSelectedVisitor = () => {
    setVisitorId(null);
    setVisitorName('');
    setGender('Others');
    setDob('');
    setEmail('');
    setPhone('+91 ');
    setAddress('');
    setContractingCompany('');
    setTradeType('Facilities Maintenance');
    setNationality('Indian');
    setIdType('Business Vendor ID');
    setIdNumber('');
    setPipeline('New Visitor / Urgent Access');
  };

  // Dynamically structure escort rows
  useEffect(() => {
    const count = Math.max(0, Math.min(headCount, 10));
    setEscorts(prev => {
      const newEscorts = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          newEscorts.push({ name: '', govId: '', email:'', phone:'', nationality: '', gender:'Others' });
        }
      } else {
        newEscorts.length = count;
      }
      return newEscorts;
    });
  }, [headCount]);

  const handleEscortChange = (index: number, field: 'name' | 'govId' | 'phone' | 'nationality' | 'gender'| 'email', value: string) => {
    const updatedEscorts = [...escorts];
    updatedEscorts[index][field] = value;
    setEscorts(updatedEscorts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now().toString().slice(-6);
      const newVisitId = `VST${timestamp}`;

      // CHANGE: Dynamic ID linker
      let activeVisitorId = visitorId;

      let documentUrl = null;
      if (file) {
        setUploadingText('Uploading credentials scan...');
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
      
      setUploadingText('Saving vendor credentials logs...');

      // CHANGE: Conditional insert logic. Only inserts a fresh profile row if one wasn't linked
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
          visit_type: 'Service',
          address: address || null,
          id_type: idType,
          id_number: idNumber || 'Pending Verification',
          nationality: nationality,
          organization: contractingCompany || 'Outsourced Firm',
          designation: tradeType || 'Service Technician',
          department: department
        });

        if (visitorError) throw visitorError;
      }

      // Pack supplemental criteria layout safely
      let finalPurpose = `[VENDOR FIELD TRADE: ${tradeType}] ${purpose}`;
      if (escorts.length > 0) {
        const guestList = escorts.map(esc => `${esc.name} (ID: ${esc.govId})`).join(', ');
        finalPurpose += ` | Accompanying Crew Manifest: ${guestList}`;
      }

      const startDate = pipeline === 'Pre-Scheduled Visit' && scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString();

      // 2. Insert Visit Record securely using activeVisitorId
      const { error: visitError } = await supabase.from('visits').insert({
        visit_id: newVisitId,
        visitor_id: activeVisitorId, // CHANGE: Mapped identifier for existing or new profiles
        host_employee_id: hostId || 'EMP001',
        created_by_employee_id: 'EMP001',
        visit_type: 'SERVICE',
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
      setError(err.message || 'System failed to write secure vendor tokens.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
      return (
        <DashboardLayout role="hr" userName="Sinchana K">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 max-w-4xl shadow-sm text-center animate-fade-in mx-auto mt-10">
            <CheckCircle2 className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-amber-800 mb-2">Service Entry Logged Successfully</h2>
            <p className="text-amber-600 font-medium">The service vendor matrices and entry pass have been securely logged.</p>
          </div>
        </DashboardLayout>
      );
    }

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-4xl mx-auto pb-12 font-sans text-slate-800">
        
        {/* Breadcrumb row */}
        <div className="mb-6">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Clearance Ledger
          </button>
        </div>

        {/* Form Panel Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" /> Service & Vendor Access Authorization Terminal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Initialize external infrastructure contractor tokens, deployment tracking, and utility access pathways safely.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold">{error}</div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Control Variable Pipeline Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50/40 p-4 border border-orange-100/60 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider mb-1.5">Work Processing Pipeline *</label>
                <select 
                  required value={pipeline} onChange={(e) => setPipeline(e.target.value)}
                  className="w-full p-2.5 border border-orange-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option>New Visitor / Urgent Access</option>
                  <option>Pre-Scheduled Visit</option>
                  <option>Repeated Visitor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider mb-1.5">Target Destination Unit Operations *</label>
                <select 
                  required value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 border border-orange-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Operations">Operations General Base</option>
                  <option value="Research Wing">Research Wing Operations</option>
                  <option value="IT Department">IT Systems Infrastructure</option>
                  <option value="Logistics">Logistics Division</option>
                </select>
              </div>
            </div>

            {pipeline === 'Pre-Scheduled Visit' && (
              <div className="p-4 bg-orange-50/30 border border-orange-100 rounded-xl animate-fade-in">
                <label className="block text-xs font-bold text-orange-900 uppercase tracking-wider mb-1.5">Authorized Deployment Timestamp Window *</label>
                <input required type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full p-2.5 border border-orange-200 rounded-lg bg-white text-xs font-bold font-mono text-slate-700 outline-none" />
              </div>
            )}

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Primary Base Identity</h4>

            {/* Core Identity Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* CHANGE: Searchable Full Name container */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Technician Full Name *</label>
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
                    className="w-full p-2.5 pr-8 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-orange-500 disabled:bg-slate-50 disabled:text-slate-600 font-semibold" 
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

                {/* Popover Matrix Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((visitor) => (
                      <div 
                        key={visitor.visitor_id}
                        onClick={() => handleSelectVisitor(visitor)}
                        className="px-4 py-2.5 text-xs text-slate-700 hover:bg-orange-50/70 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{visitor.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{visitor.organization || 'Independent Contractor'}</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold font-mono">
                          ID: {visitor.id_number || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {visitorId && (
                  <span className="text-[10px] text-orange-600 font-bold mt-1 block">
                    ✓ Linked vendor profile found tracking match.
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
                  <select value={gender} disabled={!!visitorId} onChange={(e) => setGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-orange-500 disabled:bg-slate-50">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Others">Others</option>
                  </select>
                </div>                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality *</label>
                  <select value={nationality} disabled={!!visitorId} onChange={(e) => setNationality(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-orange-500 disabled:bg-slate-50">
                    {NATIONALITIES.map(nat => (
                      <option key={nat.label} value={nat.label}>{nat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone *</label>
                  <input required type="tel" value={phone} disabled={!!visitorId} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-orange-500 disabled:bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
                <input type="date" value={dob} disabled={!!visitorId} max={maxDob} onChange={(e) => setDob(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:border-orange-500 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Representative Email Address</label>
                <input type="email" value={email} disabled={!!visitorId} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@firm.com" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-orange-500 disabled:bg-slate-50" />
              </div>
            </div>

            {/* ORANGE SECTOR VENDOR SUBSECTION */}
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Security & Track Verification</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50/20 p-4 border border-orange-100 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">Field Trade / Classification *</label>
                <select value={tradeType} disabled={!!visitorId} onChange={(e) => setTradeType(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-50">
                  <option value="Facilities Maintenance">Facilities & Infrastructure Maintenance</option>
                  <option value="IT Equipment Delivery">IT Infrastructure Hardware Vendor</option>
                  <option value="Catering Logistics">Catering & Logistics Vendor</option>
                  <option value="Outsourced Security Asset">Outsourced Security Asset</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">Contractor Authorization ID *</label>
                <select value={idType} disabled={!!visitorId} onChange={(e) => setIdType(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-50">
                  <option value="Business Vendor ID">Corporate Work Badge / Vendor ID</option>
                  <option value="Labor Token Certificate">Labor Token Certificate</option>
                  <option value="PAN Clearance Card">PAN Clearance Card</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">Credential Serial Reference *</label>
                <input required type="text" value={idNumber} disabled={!!visitorId} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter ID string" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono tracking-wider outline-none focus:ring-2 focus:ring-orange-500 uppercase disabled:bg-slate-50" />
              </div>
            </div>

            {/* Supplemental Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Contracting Agency / Corporate Employer</label>
                <input type="text" value={contractingCompany} disabled={!!visitorId} onChange={(e) => setContractingCompany(e.target.value)} placeholder="e.g. Acme Infrastructure Group" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-orange-500 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Supervising Internal Plant Host Employee ID *</label>
                <input required type="text" value={hostId} onChange={(e) => setHostId(e.target.value)} placeholder="e.g. EMP001" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-orange-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Permanent Corporate Address</label>
                <input type="text" value={address} disabled={!!visitorId} onChange={(e) => setAddress(e.target.value)} placeholder="Office Suite No, Tech Park Block, City..." className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-orange-500 disabled:bg-slate-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Scope of Structural Work Assignment Purpose *</label>
                <input required type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Scheduled Server Rack Infrastructure Maintenance Support" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-orange-500" />
              </div>
            </div>

            {/* Accompanying Crew Manifest Layout */}
            <div className="border border-slate-200 rounded-xl bg-slate-50/40 overflow-hidden mt-2">
              <div className="p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 flex items-center uppercase tracking-wide"><Users className="w-4 h-4 mr-1.5 text-slate-500" />Accompanying Crew Manifest Head Count</label>
                </div>
                <input type="number" min="0" max="10" value={headCount || ''} onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)} placeholder="0 (Single Personnel)" className="w-full sm:w-40 p-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-bold text-center focus:border-orange-500" />
              </div>

              {escorts.length > 0 && (
                <div className="p-4 bg-white space-y-3.5">
              {escorts.map((escort, index) => (
              <div key={index} className="flex flex-col gap-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 relative">
                {/* Row Index Badge */}
                <div className="absolute -left-2 -top-2 w-5 h-5 bg-orange-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-sm">
                  {index + 1}
                </div>
                
                {/* All fields wrapped in a single container with two rows */}
                <div className="flex flex-col gap-3 w-full">
                  
                  {/* FIRST ROW: Name, Gender, Nationality, Contact Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                    {/* 1. Member Full Name */}
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

                    {/* 2. Gender */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Gender *</label>
                      <select 
                        value={escort.gender} 
                        onChange={(e) => handleEscortChange(index, 'gender', e.target.value)} 
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500 disabled:bg-slate-50"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    {/* 3. Nationality */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nationality *</label>
                      <select 
                        value={escort.nationality} 
                        onChange={(e) => handleEscortChange(index, 'nationality', e.target.value)} 
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500 disabled:bg-slate-50"
                      >
                        {NATIONALITIES.map(nat => (
                          <option key={nat.label} value={nat.label}>{nat.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* 4. Contact Phone */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Contact Phone *</label>
                      <input 
                        required 
                        type="tel" 
                        value={escort.phone} 
                        onChange={(e) => handleEscortChange(index, 'phone', e.target.value)} 
                        placeholder="+91 98765 43210" 
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500 disabled:bg-slate-50" 
                      />
                    </div>
                  </div>

                  {/* SECOND ROW: Serial ID & Email Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    {/* 5. Identification Serial ID */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Identification Serial ID *</label>
                      <input 
                        required
                        type="text" 
                        value={escort.govId}
                        onChange={(e) => handleEscortChange(index, 'govId', e.target.value)}
                        placeholder="Enter Serial ID" 
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500" 
                      />
                    </div>

                    {/* 6. Email Address */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        value={escort.email || ''}
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

            {/* Document Scans */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Verification Trade credentials Scan Copy</label>
              
              <label className="border-2 border-dashed border-orange-200 rounded-xl p-6 bg-slate-50/60 flex flex-col items-center justify-center text-slate-400 hover:bg-orange-50/10 hover:border-orange-400 transition-all cursor-pointer relative">
                <UploadCloud className="w-7 h-7 mb-1.5 text-orange-600" />
                <span className="font-bold text-orange-900 text-xs">
                  {file ? (file as File).name : 'Click to Upload Corporate Work Authorization Copy'}
                </span>
                <span className="text-[10px] mt-0.5 text-slate-400 font-medium">PDF or Image logs up to 5MB size</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>

              {/* Action Operations Trigger Bars */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
                <button type="button" onClick={() => navigate('/hr/visitormgmt')} className="px-5 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-100 transition-colors text-xs">
                  Cancel Authorization
                </button>
                <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all text-xs disabled:opacity-50 flex items-center">
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
