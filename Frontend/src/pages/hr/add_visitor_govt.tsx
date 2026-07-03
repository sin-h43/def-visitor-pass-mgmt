import { useState, useEffect } from 'react';
import type {SyntheticEvent} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, UploadCloud, CheckCircle2, Landmark, Search, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';
import HRNotificationCenter from './HRNotificationCenter';


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

export default function AddVisitorGovtPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state?.autofill;

  // Form Process States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Operational Fields
  const [pipeline, setPipeline] = useState('New Visitor / Urgent Access');
  const [department, setDepartment] = useState('Research Wing');
  const [passType, setPassType] = useState('One_day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [visitorId, setVisitorId] = useState<string | null>(null);

  // Visitor Profile Metadata
  const [visitorName, setVisitorName] = useState(prefillData?.visitorName || '');
  const [gender, setGender] = useState(prefillData?.gender && prefillData.gender !== 'Others' ? prefillData.gender : 'Others');
  const [dob, setDob] = useState(prefillData?.dob !== 'N/A' ? (prefillData?.dob || '') : '');
  const [email, setEmail] = useState(prefillData?.email !== 'N/A' ? (prefillData?.email || '') : '');
  const [phone, setPhone] = useState(prefillData?.phone !== 'N/A' ? (prefillData?.phone || '+91 ') : '+91 ');
  const [nationality, setNationality] = useState('Indian');
  const [address, setAddress] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');
  const [purpose, setPurpose] = useState('');

  // Govt/Defense Specific Fields
  const [govtIdType, setGovtIdType] = useState('Defense ID Card');
  const [govtIdNumber, setGovtIdNumber] = useState('');

  const [searchResults, setSearchResults] = useState<ExistingVisitor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [headCount, setHeadCount] = useState<number>(0);
  const [escorts, setEscorts] = useState<{name: string, govId: string, email:string, nationality:string, phone: string, gender:string}[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [uploadingText, setUploadingText] = useState('');

// ✅ Unified State for User + Avatar
  const [currentUser, setCurrentUser] = useState({ uuid: '', empId: '', name: 'Loading...', dept: '', avatarUrl: '' });

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return;
        const employee = await fetchAndVerifyEmployee(user.email);
        if (employee) {
          setCurrentUser({
            uuid: employee.auth_id || employee.id,
            empId: employee.employee_id,
            name: employee.name,
            dept: employee.department || 'General Unit',
            avatarUrl: employee.avatar_url || '' // ✅ Capture Avatar
          });
        }
      } catch (err) {
        console.error('Failed to load HR profile:', err);
        setCurrentUser(prev => ({ ...prev, name: 'HR Admin' }));
      }
    };
    loadUserProfile();
  }, []);

  const maxAllowedDate = new Date();
  maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() - 12);
  const maxDob = maxAllowedDate.toISOString().split('T')[0];

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

      if (!error && data) setSearchResults(data as ExistingVisitor[]);
    };

    const debounceTimer = setTimeout(searchVisitors, 300);
    return () => clearTimeout(debounceTimer);
  }, [visitorName, visitorId]);

  const handleSelectVisitor = (visitor: ExistingVisitor) => {
    setVisitorId(visitor.visitor_id);
    setVisitorName(visitor.name);
    setGender(visitor.gender || 'Others');
    setDob(visitor.dob || '');
    setEmail(visitor.email || '');
    setPhone(visitor.phone || '+91 ');
    setAddress(visitor.address || '');
    setOrganization(visitor.organization || '');
    setDesignation(visitor.designation || '');
    setNationality(visitor.nationality || 'Indian');
    
    if (visitor.id_type && ['Defense ID Card', 'Ministry Secretarial Token', 'Government Gazetted Pass', 'Diplomatic Passports'].includes(visitor.id_type)) {
      setGovtIdType(visitor.id_type);
    }
    setGovtIdNumber(visitor.id_number || '');
    
    setShowDropdown(false);
    setPipeline('Repeated Visitor');
  };

  const handleClearSelectedVisitor = () => {
    setVisitorId(null);
    setVisitorName('');
    setGender('Others');
    setDob('');
    setEmail('');
    setPhone('+91 ');
    setAddress('');
    setOrganization('');
    setDesignation('');
    setNationality('Indian');
    setGovtIdNumber('');
    setPipeline('New Visitor / Urgent Access');
  };

  useEffect(() => {
    const count = Math.max(0, Math.min(headCount, 10));
    setEscorts(prev => {
      const newEscorts = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          newEscorts.push({ name: '', govId: '', email:'', phone:'', nationality: 'Indian', gender:'Others' });
        }
      } else {
        newEscorts.length = count;
      }
      return newEscorts;
    });
  }, [headCount]);

  const handleEscortChange = (index: number, field: 'name' | 'govId' | 'phone' | 'nationality' | 'gender'| 'email', value: string) => {
    const updatedEscorts = [...escorts];
    if (field === 'nationality') {
      const natData = NATIONALITIES.find(n => n.label === value);
      updatedEscorts[index] = { ...updatedEscorts[index], nationality: value, phone: natData?.code ? `${natData.code} ` : '' };
    } else {
      updatedEscorts[index] = { ...updatedEscorts[index], [field]: value };
    }
    setEscorts(updatedEscorts);
  };

  const handleNationalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedNat = e.target.value;
    setNationality(selectedNat);
    const natData = NATIONALITIES.find(n => n.label === selectedNat);
    if (natData && natData.code) setPhone(`${natData.code} `);
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentUser.empId) {
      setError('❌ Your employee profile failed to load. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 6).toUpperCase();
      const finalVisitorId = visitorId || `VIS-${uniqueSuffix}`;
      const newVisitId = `VST-${uniqueSuffix}`;
      
      let documentUrl = null;

      if (file) {
        setUploadingText('Uploading credentials scan...');
        const fileExt = file.name.split('.').pop();
        const fileName = `${newVisitId}_doc.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('visitor-documents').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('visitor-documents').getPublicUrl(fileName);
        documentUrl = publicUrlData.publicUrl;
      }
      
      setUploadingText('Saving secure government manifests...');

      const { error: visitorError } = await supabase.from('visitors').upsert({
        visitor_id: finalVisitorId,
        name: visitorName,
        email: email || null,
        phone: phone,
        gender: gender,
        dob: dob || null,
        address: address || null,
        id_type: govtIdType,
        id_number: govtIdNumber || 'Pending Verification',
        nationality: nationality,
        organization: organization || 'Government Ministry Command',
        designation: designation || 'Official Delegate',
        document_url: documentUrl,
      }, {
        onConflict: 'visitor_id'
      });

      if (visitorError) throw visitorError;

      let finalPurpose = `[GOVT CLEARANCE: ${govtIdType}] ${purpose}`;
      // if (escorts.length > 0) {
      //   const guestList = escorts.map(esc => `${esc.name} (ID: ${esc.govId})`).join(', ');
      //   finalPurpose += ` | Accompanying Guest Manifest: ${guestList}`;
      // }

      const finalStartDate = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
      const finalEndDate = endDate ? new Date(endDate).toISOString() : finalStartDate;

      const { error: visitError } = await supabase.from('visits').insert({
        visit_id: newVisitId,
        visitor_id: finalVisitorId,
        host_employee_id: currentUser.empId,
        visit_type: pipeline === 'Pre-Scheduled Visit' ? 'Scheduled' : 'immediate',
        pass_type: passType,
        purpose: finalPurpose,
        start_date: finalStartDate,
        end_date: finalEndDate,
        status: 'Approved',
        approved_at: new Date().toISOString(), // Automatically log approval time
        department: department
      });

      if (visitError) throw visitError;

      if (escorts.length > 0) {
        const escortsData = escorts.map((esc, index) => ({
          escort_id: `ESC-${uniqueSuffix}-${index}`,
          visit_id: newVisitId,
          name: esc.name,
          phone: esc.phone,
          department: department, 
          id_type: 'Government ID', 
          id_number: esc.govId,
          nationality: esc.nationality,
          email: esc.email || null,
          gender: esc.gender
        }));

        const { error: escortsError } = await supabase.from('escorts').insert(escortsData);
        if (escortsError) throw escortsError;
      }

      setSuccess(true);
      setTimeout(() => navigate('/hr/visitormgmt'), 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'System failed to write secure defense logs.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout role="hr" userName={currentUser.name} headerAction={<HRNotificationCenter />} avatarUrl={currentUser.avatarUrl || ''}>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 max-w-4xl shadow-sm text-center animate-fade-in mx-auto mt-10">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-emerald-800 mb-2">Government Manifest Authorized Successfully</h2>
          <p className="text-emerald-600 font-medium">The official defense security matrix clearance has been recorded.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="hr" userName={currentUser.name} headerAction={<HRNotificationCenter />} avatarUrl={currentUser.avatarUrl || ''}>
      <div className="max-w-4xl mx-auto pb-12 font-sans text-slate-800">
        <div className="mb-6">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Clearance Ledger
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-600" /> Govt & Defense Authorization Terminal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Initialize high-security clearance onboarding paths for officials and ministry personnel safely.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold">{error}</div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/40 p-4 border border-emerald-100/60 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5">Clearance Processing Pipeline *</label>
                <select required value={pipeline} onChange={(e) => setPipeline(e.target.value)} className="w-full p-2.5 border border-emerald-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500">
                  <option>New Visitor / Urgent Access</option>
                  <option>Pre-Scheduled Visit</option>
                  <option>Repeated Visitor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5">Target Destination Unit Operations *</label>
                <select required value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-2.5 border border-emerald-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="Research Wing">Research Wing Operations</option>
                  <option value="IT Department">IT Department Systems</option>
                  <option value="Cyber Security Unit">Cyber Security Operations Base</option>
                  <option value="Logistics Division">Logistics & Supply Division</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1.5">Pass Type *</label>
                <select required value={passType} onChange={(e) => setPassType(e.target.value)} className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="One_day">One Day Pass</option>
                  <option value="Multi_day">Multi-Day Pass</option>
                  <option value="Contractor">Extended Contractor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1.5">Start Date & Time *</label>
                <input required type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-xs font-bold font-mono text-slate-700 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1.5">End Date & Time *</label>
                <input required type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-xs font-bold font-mono text-slate-700 outline-none" />
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Primary Base Identity</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name *</label>
                <div className="relative flex items-center">
                  <input required type="text" value={visitorName} disabled={!!visitorId} onChange={(e) => { setVisitorName(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Type name to lookup profiles..." className="w-full p-2.5 pr-8 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-600 font-semibold" autoComplete="off" />
                  {visitorId ? (
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
                      <div key={visitor.visitor_id} onClick={() => handleSelectVisitor(visitor)} className="px-4 py-2.5 text-xs text-slate-700 hover:bg-emerald-50/70 cursor-pointer flex justify-between items-center transition-colors">
                        <div>
                          <span className="font-bold text-slate-900 block">{visitor.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{visitor.email || 'No email registered'}</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold font-mono">
                          {visitor.id_type || 'ID'}: {visitor.id_number || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {visitorId && <span className="text-[10px] text-emerald-600 font-bold mt-1 block">✓ Linked official profile found tracking match.</span>}
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
                  <select value={gender} disabled={!!visitorId} onChange={(e) => setGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-emerald-500 disabled:bg-slate-50">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Others">Others</option>
                  </select>
                </div>                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality *</label>
                  <select value={nationality} disabled={!!visitorId} onChange={handleNationalityChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-emerald-500 disabled:bg-slate-50">
                    {NATIONALITIES.map(nat => <option key={nat.label} value={nat.label}>{nat.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone *</label>
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
                <input type="date" value={dob} disabled={!!visitorId} max={maxDob} onChange={(e) => setDob(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Official Network Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@nic.in" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500" />
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Security & Track Verification</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/20 p-4 border border-emerald-100 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Government ID Type Dropdown *</label>
                <select value={govtIdType} onChange={(e) => setGovtIdType(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="Defense ID Card">Defense ID / Armed Forces Card</option>
                  <option value="Ministry Secretarial Token">Ministry Secretarial Token</option>
                  <option value="Government Gazetted Pass">Government Gazetted Pass</option>
                  <option value="Diplomatic Passports">Diplomatic Passports Token</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Government ID Input Field *</label>
                <input required type="text" value={govtIdNumber} onChange={(e) => setGovtIdNumber(e.target.value)} placeholder="Enter Official Credential ID String" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono tracking-wider outline-none focus:ring-2 focus:ring-emerald-500 uppercase" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Command Ministry / Department Group Name</label>
                <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. Ministry of Defence Command" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Official Assignment Rank / Designation</label>
                <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Wing Commander / Joint Secretary" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Permanent Residential / Operational Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Base Quarters, Complex Suite No, City, State..." className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Detailed Briefing Mission Purpose Statement *</label>
                <input required type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="State dynamic mission objectives explicitly..." className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl bg-slate-50/40 overflow-hidden mt-2">
              <div className="p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 flex items-center uppercase tracking-wide">
                    <Users className="w-4 h-4 mr-1.5 text-slate-500" /> Attending Contingent Crew Head Count
                  </label>
                </div>
                <input type="number" min="0" max="10" value={headCount || ''} onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)} placeholder="0 (Single Personnel)" className="w-full sm:w-40 p-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-bold text-center focus:border-emerald-500" />
              </div>

              {escorts.length > 0 && (
                <div className="p-4 bg-white space-y-3.5">
                  {escorts.map((escort, index) => (
                    <div key={index} className="flex flex-col gap-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 relative">
                      <div className="absolute -left-2 -top-2 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-sm">
                        {index + 1}
                      </div>
                      <div className="flex flex-col gap-3 w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                          <div className='sm:col-span-2'>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Member Full Name *</label>
                            <input required type="text" value={escort.name} onChange={(e) => handleEscortChange(index, 'name', e.target.value)} placeholder="Enter name" className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Gender *</label>
                            <select value={escort.gender} onChange={(e) => handleEscortChange(index, 'gender', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500">
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Non-binary">Non-binary</option>
                              <option value="Others">Others</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nationality *</label>
                            <select value={escort.nationality} onChange={(e) => handleEscortChange(index, 'nationality', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500">
                              {NATIONALITIES.map(nat => <option key={nat.label} value={nat.label}>{nat.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Contact Phone *</label>
                            <input required type="tel" value={escort.phone} onChange={(e) => handleEscortChange(index, 'phone', e.target.value)} placeholder="+91 98765 43210" className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Identification Serial ID *</label>
                            <input required type="text" value={escort.govId} onChange={(e) => handleEscortChange(index, 'govId', e.target.value)} placeholder="Enter Serial ID" className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
                            <input type="email" value={escort.email || ''} onChange={(e) => handleEscortChange(index, 'email', e.target.value)} placeholder="e.g. name@domain.com" className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium outline-none focus:border-blue-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Verification Clearance Scans Copy</label>
              <label className="border-2 border-dashed border-emerald-200 rounded-xl p-6 bg-slate-50/60 flex flex-col items-center justify-center text-slate-400 hover:bg-emerald-50/10 hover:border-emerald-400 transition-all cursor-pointer relative">
                <UploadCloud className="w-7 h-7 mb-1.5 text-emerald-600 animate-pulse" />
                <span className="font-bold text-emerald-900 text-xs">
                  {file ? (file as File).name : 'Click to Upload Encrypted Clearance Manifest Copy'}
                </span>
                <span className="text-[10px] mt-0.5 text-slate-400 font-medium">Secure PDF or image logs up to 5MB</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
                <button type="button" onClick={() => navigate('/hr/visitormgmt')} className="px-5 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-100 transition-colors text-xs">
                  Cancel Authorization
                </button>
                <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all text-xs disabled:opacity-50 flex items-center">
                  {loading ? (uploadingText || 'Processing Systems Log...') : 'Commit Application'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}