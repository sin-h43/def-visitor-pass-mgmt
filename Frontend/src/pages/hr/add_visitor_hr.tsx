import { useState, useEffect } from 'react';
import type {SyntheticEvent} from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, UploadCloud, CheckCircle2 } from 'lucide-react';
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

export default function AddVisitorHRPage() {
  const navigate = useNavigate();

  // Form Process States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Operational Fields
  const [pipeline, setPipeline] = useState('New Visitor / Urgent Access');
  const [passType, setPassType] = useState('One_day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('HR Department');

  const [existingVisitorId, setExistingVisitorId] = useState<string | null>(null);

  // Visitor Profile Metadata
  const [visitorName, setVisitorName] = useState('');
  const [gender, setGender] = useState('Others');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [nationality, setNationality] = useState('Indian');
  const [address, setAddress] = useState('');
  const [organization, setOrganization] = useState('');
  const [purpose, setPurpose] = useState('');

  // HR Track Specific Fields
  const [hrOnboardingTrack, setHrOnboardingTrack] = useState('Interview Candidate');
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [hostId, setHostId] = useState(''); 

  // Accompanying Contingent State
  const [headCount, setHeadCount] = useState<number>(0);
  const [escorts, setEscorts] = useState<{name: string, govId: string, email:string, nationality:string, phone: string, gender:string, idType:string}[]>([]);

  // Autofill / Search State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadingText, setUploadingText] = useState('');

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
        console.error('Failed to load HOD profile:', err);
        setCurrentUser(prev => ({ ...prev, name: 'HOD Admin' }));
      }
    };
    loadUserProfile();
  }, []);

  const maxAllowedDate = new Date();
  maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() - 12);
  const maxDob = maxAllowedDate.toISOString().split('T')[0];

  // Debounced search for existing visitors
  useEffect(() => {
    const searchVisitors = async () => {
      if (existingVisitorId) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      if (visitorName.length < 3) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('visitors')
          .select('*')
          .ilike('name', `%${visitorName}%`) // Case-insensitive search
          .limit(5);

        if (error) throw error;

        if (data && data.length > 0) {
          setSearchResults(data);
          setShowDropdown(true);
        } else {
          setSearchResults([]);
          setShowDropdown(false);
        }
      } catch (err) {
        console.error('Failed to search visitors:', err);
      } finally {
        setIsSearching(false);
      }
    };

    // Wait 500ms after the user stops typing before querying
    const timeoutId = setTimeout(searchVisitors, 500);
    return () => clearTimeout(timeoutId);
  }, [visitorName]);

  // Autofill the form when a visitor is selected
  const handleSelectVisitor = (visitor: any) => {
    setExistingVisitorId(visitor.visitor_id);
    setVisitorName(visitor.name);
    setGender(visitor.gender || 'Others');
    setDob(visitor.dob || '');
    setEmail(visitor.email || '');
    setPhone(visitor.phone || '+91 ');
    setNationality(visitor.nationality || 'Indian');
    setAddress(visitor.address || '');
    setOrganization(visitor.organization || '');
    setIdType(visitor.id_type || 'Aadhaar');
    setIdNumber(visitor.id_number || '');
    
    // Switch pipeline to repeated automatically
    setPipeline('Repeated Visitor');
    
    // Hide dropdown
    setShowDropdown(false);
  };


  useEffect(() => {
    const count = Math.max(0, Math.min(headCount, 10));
    setEscorts(prev => {
      const newEscorts = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          newEscorts.push({ name: '', govId: '', email:'', phone:'', nationality: 'Indian', gender:'Others',idType:'Aadhaar' });
        }
      } else {
        newEscorts.length = count;
      }
      return newEscorts;
    });
  }, [headCount]);

  const handleEscortChange = (index: number, field: 'name' | 'govId' | 'phone' | 'nationality' | 'gender'| 'email' | 'idType', value: string) => {
    const updatedEscorts = [...escorts];
    
    if (field === 'nationality') {
      const natData = NATIONALITIES.find(n => n.label === value);
      updatedEscorts[index] = {
        ...updatedEscorts[index],
        nationality: value,
        phone: natData?.code ? `${natData.code} ` : ''
      };
    } else {
      updatedEscorts[index] = {
        ...updatedEscorts[index],
        [field]: value
      };
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
// 1. Generate a robust unique suffix to permanently stop 409 collisions
      const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // 2. Map the final ID. If autofilled, it uses existingVisitorId. If new, it creates one.
      const finalVisitorId = existingVisitorId || `VIS-${uniqueSuffix}`;
      const newVisitId = `VST-${uniqueSuffix}`;

      let documentUrl = null;
      if (file) {
        setUploadingText('Uploading credentials copy...');
        const fileExt = file.name.split('.').pop();
        const fileName = `${newVisitId}_doc.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('visitor-documents').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('visitor-documents').getPublicUrl(fileName);
        documentUrl = publicUrlData.publicUrl;
      }
      
      setUploadingText('Saving secure HR registries...');
// ✅ Changed to .upsert and added the onConflict rule at the bottom
      const { error: visitorError } = await supabase.from('visitors').upsert({
        visitor_id: finalVisitorId,
        name: visitorName,
        email: email || null,
        phone: phone,
        gender: gender,
        dob: dob || null,
        address: address || null,
        id_type: idType,
        id_number: idNumber || 'Pending Verification',
        nationality: nationality,
        organization: organization || 'Internal HR Evaluation',
        designation: hrOnboardingTrack,
        document_url: documentUrl,
      }, {
        onConflict: 'visitor_id' // This tells the database to UPDATE if the ID already exists
      });

      if (visitorError) throw visitorError;

      if (visitorError) throw visitorError;

      let finalPurpose = `[HOD TRACK: ${hrOnboardingTrack}] ${purpose}`;
      const finalStartDate = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
      // Default end date to start date + 1 hour if not provided, or map to user input
      const finalEndDate = endDate ? new Date(endDate).toISOString() : finalStartDate;
      const { error: visitError } = await supabase.from('visits').insert({
        visit_id: newVisitId,
        visitor_id: finalVisitorId,
        host_employee_id: currentUser.empId, // Dynamically linked to the HR's employee ID
        category: 'hod',
        visit_type: pipeline === 'Pre-Scheduled Visit' ? 'Scheduled' : 'immediate', // Dynamically matching your DB
        pass_type: passType,
        purpose: finalPurpose,
        start_date: finalStartDate, 
        end_date: finalEndDate,    
        status: 'Approved',
        department: department
      });

      if (visitError) throw visitError;

      // 3. Bulk Insert into ESCORTS Table
      if (escorts.length > 0) {
        // Map the React state array to match your Supabase escorts table schema
        const escortsData = escorts.map((esc, index) => ({
          escort_id: `ESC-${uniqueSuffix}-${index}`, // Generate unique ID appended with index
          visit_id: newVisitId,
          name: esc.name,
          phone: esc.phone,
          department: department, // Inherit department from the primary visit
          id_type: 'Government ID', // Defaulting since the UI doesn't specify escort ID type
          id_number: esc.govId,
          nationality: esc.nationality,
          email: esc.email || null,
          gender: esc.gender
        }));

        const { error: escortsError } = await supabase.from('escorts').insert(escortsData);
        
        if (escortsError) throw escortsError;
      }
      setSuccess(true);
      setTimeout(() => navigate('/hod/visitormgmt'), 2000);

    } catch (err: any) {
      console.error(err);
      if (err.code === '23503' || err.message?.includes('foreign key')) {
        setError(`❌ Database Error: The Host ID (${hostId}) could not be found. Please double-check the Host Employee ID.`);
      } else {
        setError(err.message || 'System failed to write HOD clearance logs.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout role="hr" userName={currentUser.name} headerAction={<HRNotificationCenter />} avatarUrl={currentUser.avatarUrl || ''}>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-8 max-w-4xl shadow-sm text-center animate-fade-in mx-auto mt-10">
          <CheckCircle2 className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-purple-800 mb-2">HOD Registration Committed Successfully</h2>
          <p className="text-purple-600 font-medium">The candidate onboarding matrix pass rules have been registered.</p>
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
              <Shield className="w-5 h-5 text-purple-600" /> HOD Registry Track System
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Initialize secure candidate assessment metrics and facility boarding pathways.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold">{error}</div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/40 p-4 border border-purple-100/60 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1.5">Onboarding Processing Pipeline *</label>
                <select required value={pipeline} onChange={(e) => setPipeline(e.target.value)} className="w-full p-2.5 border border-purple-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500">
                  <option>New Visitor / Urgent Access</option>
                  <option>Pre-Scheduled Visit</option>
                  <option>Repeated Visitor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1.5">Assigned Target Unit Department *</label>
                <select required value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-2.5 border border-purple-200 rounded-xl bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="HR Department">Human Resources / Evaluation</option>
                  <option value="Research Wing">Research Wing Operations</option>
                  <option value="IT Department">IT Department</option>
                </select>
              </div>
            </div>

{/* Pass Type & Scheduling Grid - Always visible for precise time tracking */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-purple-50/30 border border-purple-100 rounded-xl animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1.5">Pass Type *</label>
                <select required value={passType} onChange={(e) => setPassType(e.target.value)} className="w-full p-2.5 border border-purple-200 rounded-lg bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="One_day">One Day Pass</option>
                  <option value="Multi_day">Multi-Day Pass</option>
                  <option value="Contractor">Extended Contractor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1.5">Start Date & Time *</label>
                <input required type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 border border-purple-200 rounded-lg bg-white text-xs font-bold font-mono text-slate-700 outline-none" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1.5">End Date & Time *</label>
                <input required type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 border border-purple-200 rounded-lg bg-white text-xs font-bold font-mono text-slate-700 outline-none" />
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Primary Base Identity</h4>

<div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1 flex justify-between">
                  <span>Full Name *</span>
                  {isSearching && <span className="text-[10px] text-purple-500 animate-pulse">Searching...</span>}
                </label>
              <input 
                  required 
                  type="text" 
                  value={visitorName} 
                  onChange={(e) => {
                    setVisitorName(e.target.value);
                    setExistingVisitorId(null); // ✅ ADD THIS LINE: Reset ID if they type manually
                    setShowDropdown(true);
                  }} 
                  placeholder="Appointee Full Name" 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-500" 
                  autoComplete="off"
                />
                
                {/* Autocomplete Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
                    {searchResults.map((v) => (
                      <li 
                        key={v.visitor_id} 
                        onClick={() => handleSelectVisitor(v)}
                        className="p-3 border-b border-slate-50 hover:bg-purple-50 cursor-pointer flex flex-col transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-800">{v.name}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-500 font-mono">{v.phone}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{v.id_type}: {v.id_number}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Gender *</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-purple-500">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Others">Others</option>
                  </select>
                </div>                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality *</label>
                  <select value={nationality} onChange={handleNationalityChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white outline-none focus:border-purple-500">
                    {NATIONALITIES.map(nat => <option key={nat.label} value={nat.label}>{nat.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone *</label>
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-purple-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
                <input type="date" value={dob} max={maxDob} onChange={(e) => setDob(e.target.value)}  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Secure Email Address *</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="candidate@domain.com" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-500" />
              </div>          

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 border-b border-slate-50 pb-1">Security & Track Verification</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-purple-50/20 p-4 border border-purple-100 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">HOD Context Track *</label>
                <select value={hrOnboardingTrack} onChange={(e) => setHrOnboardingTrack(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="Interview Candidate">Recruitment / Interview Target</option>
                  <option value="Contractor Onboarding">Contracted Workforce Orientation</option>
                  <option value="Union Representative">Internal Dispute / Union Counsel</option>
                  <option value="Audit Delegate">External Compliance / Benefits Auditor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">ID Token Group Type *</label>
                <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="PAN">PAN Clearance Card</option>
                  <option value="Passport">Passport Document</option>
                  <option value="Aadhaar">Aadhaar National ID</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">Identity Token Serial ID *</label>
                <input required type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter Serial Reference ID" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono tracking-wider outline-none focus:ring-2 focus:ring-purple-500 uppercase" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Sponsoring Educational Institution / Organization</label>
                <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. PES University Campus" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Internal Evaluator Host Staff ID *</label>
                <input required type="text" value={hostId} onChange={(e) => setHostId(e.target.value)} placeholder="e.g. EMP-12345" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-purple-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Permanent Address Details</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street Address, City, State..." className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Operational Event Brief Statement *</label>
                <input required type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Final Technical Summer Internship Evaluation Sync Panel" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-500" />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl bg-slate-50/40 overflow-hidden mt-2">
              <div className="p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 flex items-center uppercase tracking-wide">
                    <Users className="w-4 h-4 mr-1.5 text-slate-500" /> Accompanying Companion Head Count
                  </label>
                </div>
                <input type="number" min="0" max="10" value={headCount || ''} onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)} placeholder="0 (Single Personnel)" className="w-full sm:w-40 p-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-bold text-center focus:border-purple-500" />
              </div>

              {escorts.length > 0 && (
                <div className="p-4 bg-white space-y-3.5">
                  {escorts.map((escort, index) => (
                    <div key={index} className="flex flex-col gap-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 relative">
                      <div className="absolute -left-2 -top-2 w-5 h-5 bg-purple-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white shadow-sm">
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
                            <select value={escort.gender} onChange={(e) => handleEscortChange(index, 'gender', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500 disabled:bg-slate-50">
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Non-binary">Non-binary</option>
                              <option value="Others">Others</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nationality *</label>
                            <select value={escort.nationality} onChange={(e) => handleEscortChange(index, 'nationality', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500 disabled:bg-slate-50">
                              {NATIONALITIES.map(nat => <option key={nat.label} value={nat.label}>{nat.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Contact Phone *</label>
                            <input required type="tel" value={escort.phone} onChange={(e) => handleEscortChange(index, 'phone', e.target.value)} placeholder="+91 98765 43210" className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500 disabled:bg-slate-50" />
                          </div>
                        </div>
{/* BOTTOM ROW: ID Type, ID Number, Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                          
                          {/* 1. ID Type Select */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Identification Type *</label>
                            <select value={escort.idType} onChange={(e) => handleEscortChange(index, 'idType', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-blue-500">
                              <option value="PAN">PAN Clearance Card</option>
                              <option value="Passport">Passport Document</option>
                              <option value="Aadhaar">Aadhaar National ID</option>
                            </select> 
                          </div>

                          {/* 2. Serial ID Input */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">{escort.idType} Serial ID *</label>
                            <input required type="text" value={escort.govId} onChange={(e) => handleEscortChange(index, 'govId', e.target.value)} placeholder="Enter Serial ID" className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500" />
                          </div>

                          {/* 3. Email Input */}
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
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Verification Document Scans Copy</label>
              <label className="border-2 border-dashed border-purple-200 rounded-xl p-6 bg-slate-50/60 flex flex-col items-center justify-center text-slate-400 hover:bg-purple-50/10 hover:border-purple-400 transition-all cursor-pointer relative">
                <UploadCloud className="w-7 h-7 mb-1.5 text-purple-600 animate-pulse" />
                <span className="font-bold text-purple-900 text-xs">
                  {file ? (file as File).name : 'Click to Upload Verification Manifest PDF'}
                </span>
                <span className="text-[10px] mt-0.5 text-slate-400 font-medium">PDF or Image Scans up to 5MB size</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
                <button type="button" onClick={() => navigate('/hod/visitormgmt')} className="px-5 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-100 transition-colors text-xs">
                  Cancel Registry
                </button>
                <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all text-xs disabled:opacity-50 flex items-center">
                  {loading ? (uploadingText || 'Processing Data...') : 'Commit Application'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}