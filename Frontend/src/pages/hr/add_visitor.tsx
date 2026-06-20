// pages/hr/add_visitor.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Users, Globe, Landmark, Briefcase, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';

// --- NEW / CHANGED HERE: Added the Nationalities Array for the smart phone formatting ---
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

export default function HRAddVisitorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const prefillData = location.state?.autofill;
  const isEdit = location.state?.isEdit || false;
  
  const initialCategory = prefillData?.category?.toLowerCase() || searchParams.get('category') || 'general';
  const formalizedCategory = initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1);
  const normalizedMatch = initialCategory.toLowerCase();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadingText, setUploadingText] = useState('');

  const [pipeline, setPipeline] = useState(
    prefillData?.pipeline === 'Pre-Scheduled' ? 'Pre-Scheduled Visit Pipeline' : 
    prefillData?.pipeline === 'Repeated' ? 'Repeated Framework Profile' : 
    'Immediate Access / Live Walk-in'
  );
  const [scheduledDate, setScheduledDate] = useState('');
  
  const [headCount, setHeadCount] = useState<number>(prefillData?.escorts?.length || 0);
  const [escorts, setEscorts] = useState<{ name: string; govId: string }[]>(
    prefillData?.escorts?.map((e: any) => ({ name: e.name, govId: e.id_number })) || []
  );

  // --- NEW / CHANGED HERE: Unified Base Identity States (Added Nationality, Org, Designation) ---
  const [visitorName, setVisitorName] = useState(prefillData?.visitorName || '');
  const [nationality, setNationality] = useState(prefillData?.nationality || 'Indian');
  const [phone, setPhone] = useState(prefillData?.phone !== 'N/A' ? (prefillData?.phone || '+91 ') : '+91 ');
  const [email, setEmail] = useState(prefillData?.email !== 'N/A' ? (prefillData?.email || '') : '');
  const [dob, setDob] = useState(prefillData?.dob !== 'N/A' ? (prefillData?.dob || '') : '');
  const [designation, setDesignation] = useState(prefillData?.designation || '');
  const [organization, setOrganization] = useState(prefillData?.organization !== 'N/A' ? (prefillData?.organization || '') : '');
  const [idType, setIdType] = useState(prefillData?.id_type || 'Aadhaar');
  const [idNumber, setIdNumber] = useState(prefillData?.id_number !== 'N/A' ? (prefillData?.id_number || '') : '');
  const [address, setAddress] = useState(prefillData?.address !== 'N/A' ? (prefillData?.address || '') : '');
  const [purpose, setPurpose] = useState(prefillData?.purpose || '');

  // Category-Specific Extra Fields State (Cleaned up redundant states since we now use 'organization' and 'idNumber' natively)
  const [visaNumber, setVisaNumber] = useState('');
  const [visaExpiry, setVisaExpiry] = useState('');
  const [workOrderRef, setWorkOrderRef] = useState('');

  // --- NEW / CHANGED HERE: Smart phone code updater ---
  const handleNationalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedNat = e.target.value;
    setNationality(selectedNat);
    const natData = NATIONALITIES.find(n => n.label === selectedNat);
    if (natData && natData.code) {
      setPhone(`${natData.code} `);
    }
  };

  useEffect(() => {
    const count = Math.max(0, Math.min(headCount, 15));
    setEscorts(prev => {
      const updated = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          updated.push({ name: '', govId: '' });
        }
      } else {
        updated.length = count;
      }
      return updated;
    });
  }, [headCount]);

  const handleEscortChange = (index: number, field: 'name' | 'govId', value: string) => {
    const updated = [...escorts];
    updated[index][field] = value;
    setEscorts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now().toString().slice(-6);
      const newVisitorId = isEdit ? prefillData.id.replace('VST', 'VIS') : `VIS${timestamp}`; 
      const currentVisitId = isEdit ? prefillData.id : `VST${timestamp}`;

      let documentUrl = prefillData?.documentUrl || null;
      if (file) {
        setUploadingText('Uploading document vault...');
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentVisitId}_doc_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('visitor-documents').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('visitor-documents').getPublicUrl(fileName);
        documentUrl = publicUrlData.publicUrl;
      }
      setUploadingText('Encrypting ledger...');

      // Map HR Specific Fields to Standard DB Schema
      let finalPurpose = purpose;
      if (normalizedMatch === 'foreign') {
        finalPurpose = `[Visa: ${visaNumber} | Exp: ${visaExpiry}] ${purpose}`;
      } else if (normalizedMatch === 'service') {
        finalPurpose = `[WO: ${workOrderRef}] ${purpose}`;
      }

      // --- NEW / CHANGED HERE: Including Designation in the Upsert Payload ---
      const visitorPayload = {
        visitor_id: newVisitorId,
        name: visitorName,
        email: email || null,
        phone: phone,
        dob: dob || null,
        address: address || null,
        id_type: normalizedMatch === 'foreign' ? 'Passport' : idType, // Foreign is strictly passport
        id_number: idNumber || 'Pending',
        nationality: nationality,
        organization: organization || null,
        designation: designation || null, 
        document_url: documentUrl
      };

      const { error: visitorError } = await supabase.from('visitors').upsert(visitorPayload);
      if (visitorError) throw visitorError;

      const dbVisitType = pipeline.includes('Pre-Scheduled') ? 'PRESCHEDULED' : pipeline.includes('Repeated') ? 'REPEATED' : 'IMMEDIATE';
      const startDate = pipeline.includes('Pre-Scheduled') && scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString();

      const visitPayload = {
        visit_id: currentVisitId,
        visitor_id: newVisitorId,
        host_employee_id: 'EMP001', 
        created_by_employee_id: 'EMP001',
        visit_type: dbVisitType,
        department: formalizedCategory, 
        pass_type: 'ONE_DAY',
        purpose: finalPurpose,
        start_date: startDate,
        status: isEdit ? 'Pending' : 'Pending', 
      };

      const { error: visitError } = await supabase.from('visits').upsert(visitPayload);
      if (visitError) throw visitError;

      if (isEdit) {
        await supabase.from('escorts').delete().eq('visit_id', currentVisitId);
      }

      if (escorts.length > 0) {
        const escortsData = escorts.map(e => ({
          visit_id: currentVisitId,
          name: e.name,
          id_number: e.govId,
          id_type: 'Govt ID'
        }));
        const { error: escortError } = await supabase.from('escorts').insert(escortsData);
        if (escortError) throw escortError;
      }

      setSuccess(true);
      setTimeout(() => navigate('/hr/visitormgmt'), 2000);

    } catch (err: any) {
      console.error('Registration Error:', err);
      setError(err.message || 'Failed to securely process entry pass.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout role="hr" userName="Sinchana K">
        <div className="max-w-4xl mx-auto flex items-center justify-center h-[60vh]">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 shadow-sm text-center animate-fade-in w-full">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-emerald-800 mb-2">{isEdit ? 'Pass Updated Successfully' : 'Clearance Registration Successful'}</h2>
            <p className="text-emerald-600">The identity matrix and entry pass have been securely logged into the HR framework.</p>
            <p className="text-sm text-emerald-500 mt-4">Routing back to Management Console...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-4xl mx-auto space-y-4">
        
        <div>
          <button 
            onClick={() => navigate('/hr/visitormgmt')}
            className="flex items-center text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Clearance Management
          </button>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">
            {isEdit ? 'Edit Request: ' : 'Onboarding Track: '} <span className="text-blue-600 font-bold">{formalizedCategory} Pass</span>
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="bg-white border border-slate-400/80 rounded-xl p-4 shadow-sm">
          
          <div className="border-b border-slate-400/60 pb-2 mb-6">
            <h2 className="text-lg font-bold text-slate-800">Security Access Registry Form</h2>
            <p className="text-xs text-slate-500">Deploying baseline identity rules combined with specialized {formalizedCategory} tracking parameters.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            
            <div className="bg-slate-50 p-4 border border-slate-400/60 rounded-lg">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Pass Processing Variant Type *</label>
              <select 
                value={pipeline}
                onChange={(e) => setPipeline(e.target.value)}
                className="w-full p-1.5 border border-slate-400/60 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Immediate Access / Live Walk-in">Immediate Access / Live Walk-in</option>
                <option value="Pre-Scheduled Visit Pipeline">Pre-Scheduled Visit Pipeline</option>
                <option value="Repeated Framework Profile">Repeated Framework Profile</option>
              </select>
            </div>

            {pipeline === 'Pre-Scheduled Visit Pipeline' && (
              <div className="p-2 rounded-lg animate-fade-in">
                <label className="block text-sm font-semibold text-amber-400 mb-1">Requested Arrival Date & Time *</label>
                <input 
                  required
                  type="datetime-local" 
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-1.5 border border-blue-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            )}

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">A. Compulsory Base Identity Data</h4>
            
            {/* --- NEW / CHANGED HERE: Completely Redesigned Base Identity Grid to house new fields cleanly --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Row 1 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Legal Name *</label>
                <input required type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} placeholder="e.g. Sarah Jenkins" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nationality *</label>
                <select value={nationality} onChange={handleNationalityChange} className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                  {NATIONALITIES.map(nat => <option key={nat.label} value={nat.label}>{nat.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone *</label>
                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm font-mono" />
              </div>

              {/* Row 2 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Architect" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>

              {/* Row 3: Only show generic Organization here if NOT Govt or Service (to avoid duplicate boxes) */}
              {normalizedMatch !== 'govt' && normalizedMatch !== 'service' && (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Organization / Company</label>
                  <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. Acme Corp Ltd." className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
              )}
              
              {/* Row 4: Base ID Type/Number (Hidden for Foreign/Govt, as they get custom inputs below) */}
              {normalizedMatch !== 'foreign' && normalizedMatch !== 'govt' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Govt ID Type *</label>
                    <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Driving License">Driving License</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Govt ID Reference Number *</label>
                    <input required type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter 12-Digit Identity / Document Reference" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm font-mono uppercase" />
                  </div>
                </>
              )}

              {/* Row 5: Address */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Residence Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House/Office No, Street, City, State, Pincode" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>

              {/* ========================================================
                  DYNAMIC REQUISITE SECTION: SPECIALIZED FORMS
                  (Redesigned to plug seamlessly into our unified states)
              ======================================================== */}
              {normalizedMatch === 'foreign' && (
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-orange-50/40 border border-orange-300 rounded-xl space-y-1 md:space-y-0 animate-fade-in mt-2">
                  <div className="md:col-span-3 flex items-center space-x-2 text-orange-800 font-bold text-sm border-b border-orange-200 pb-2 mb-2">
                    <Globe className="w-4 h-4 text-orange-600" />
                    <span>Sovereign Passport & Visa Credential Tracking</span>
                  </div>
                  {/* Nationality is now in Base Form! */}
                  <div>
                    <label className="block text-xs font-bold text-orange-900 uppercase mb-1">Passport Serial Number *</label>
                    <input required type="text" placeholder="e.g. GBR902183" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="w-full p-2.5 border border-orange-300 rounded-lg bg-white focus:ring-1 focus:ring-orange-500 text-sm outline-none font-mono uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-900 uppercase mb-1">Visa Reference Number</label>
                    <input type="text" placeholder="e.g. V-293810" value={visaNumber} onChange={(e) => setVisaNumber(e.target.value)} className="w-full p-2.5 border border-orange-300 rounded-lg bg-white focus:ring-1 focus:ring-orange-500 text-sm outline-none font-mono uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-900 uppercase mb-1">Visa Expiry Date</label>
                    <input type="date" value={visaExpiry} onChange={(e) => setVisaExpiry(e.target.value)} className="w-full p-2.5 border border-orange-300 rounded-lg bg-white focus:ring-1 focus:ring-orange-500 text-sm outline-none text-slate-700" />
                  </div>
                </div>
              )}

              {normalizedMatch === 'govt' && (
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-purple-50/40 border border-purple-300 rounded-xl animate-fade-in mt-2">
                  <div className="md:col-span-2 flex items-center space-x-2 text-purple-800 font-bold text-sm border-b border-purple-200 pb-2 mb-2">
                    <Landmark className="w-4 h-4 text-purple-600" />
                    <span>Official Ministry / Agency Credentials Command</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-900 uppercase mb-1">Department / Agency Name *</label>
                    <input required type="text" placeholder="e.g. DRDO / Ministry of Defence" value={organization} onChange={(e) => setOrganization(e.target.value)} className="w-full p-2.5 border border-purple-300 rounded-lg bg-white focus:ring-1 focus:ring-purple-500 text-sm outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-900 uppercase mb-1">Government Badge Ref ID *</label>
                    <input required type="text" placeholder="e.g. GOV-SEC-998" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="w-full p-2.5 border border-purple-300 rounded-lg bg-white focus:ring-1 focus:ring-purple-500 text-sm outline-none font-mono uppercase" />
                  </div>
                </div>
              )}

              {normalizedMatch === 'service' && (
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-emerald-50/40 border border-emerald-300 rounded-xl animate-fade-in mt-2">
                  <div className="md:col-span-2 flex items-center space-x-2 text-emerald-800 font-bold text-sm border-b border-emerald-200 pb-2 mb-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span>Corporate Vendor / Plant Service Manifest</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Contractor / Firm Name *</label>
                    <input required type="text" placeholder="e.g. Siemens Facilities" value={organization} onChange={(e) => setOrganization(e.target.value)} className="w-full p-2.5 border border-emerald-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 text-sm outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Work Order / Maint ID Ref</label>
                    <input type="text" placeholder="e.g. WO-2026-881" value={workOrderRef} onChange={(e) => setWorkOrderRef(e.target.value)} className="w-full p-2.5 border border-emerald-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 text-sm outline-none font-mono uppercase" />
                  </div>
                </div>
              )}

              <div className="md:col-span-3 mt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose of Visit / Protocol Target Objective *</label>
                <textarea required value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="State structural reasons for facility checkpoint entry clearly..." className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>

            {/* Dynamic Group Escort Component Manifest */}
            <div className="border border-slate-400/80 rounded-xl overflow-hidden animate-fade-in mt-6">
              <div className="bg-slate-100 p-3.5 border-b border-slate-400/60 flex items-center justify-between">
                <span className="font-bold text-slate-700 text-sm flex items-center">
                  <Users className="w-4 h-4 mr-2 text-slate-500" />
                  Escorted Contingent Manifest
                </span>
                <input 
                  type="number" min="0" max="15" value={headCount || ''} onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)}
                  placeholder="Count" className="w-16 p-1 text-center text-sm border border-slate-300 rounded bg-white outline-none font-medium" 
                />
              </div>
              
              {escorts.length > 0 && (
                <div className="p-4 space-y-4 bg-slate-50/50 max-h-[300px] overflow-y-auto">
                  {escorts.map((escort, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-300 rounded-lg bg-white relative pt-5">
                      <div className="absolute -left-2.5 -top-2.5 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Personnel Full Name</label>
                        <input required type="text" value={escort.name} onChange={(e) => handleEscortChange(index, 'name', e.target.value)} placeholder="Enter legal name" className="w-full p-2 text-sm border border-slate-300 rounded-md bg-slate-50 focus:bg-white outline-none font-medium" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Govt ID / Passport Ref</label>
                        <input required type="text" value={escort.govId} onChange={(e) => handleEscortChange(index, 'govId', e.target.value)} placeholder="Enter validation code" className="w-full p-2 text-sm border border-slate-300 rounded-md bg-slate-50 focus:bg-white outline-none font-medium font-mono uppercase" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Verification Block */}
            <div className="mt-6">
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Scan Verification Documentation {normalizedMatch === 'foreign' && '(Passport & Visa Copies Required)'}
              </label>
              
              <label className="border-2 border-dashed border-slate-400/80 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-500 transition-all cursor-pointer relative">
                {isEdit && prefillData?.documentUrl && !file ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-700">Existing Document Detected</span>
                    <span className="text-xs text-slate-500 mt-1">Click to overwrite with a new file</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className={`w-8 h-8 mb-2 ${file ? 'text-blue-500' : 'text-slate-400'}`} />
                    <span className="text-sm font-semibold text-slate-700">{file ? file.name : 'Drag & Drop or Click to Scan Identifications'}</span>
                    <span className="text-xs text-slate-400 mt-1">Acceptable formats: PDF, PNG, JPG up to 5MB</span>
                  </>
                )}
                
                <input 
                  type="file" 
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
            </div>

            {/* Footer Action Controls */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-400/60">
              <button 
                type="button"
                onClick={() => navigate('/hr/visitormgmt')}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 shadow-sm transition-colors flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingText || 'Processing...'}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {isEdit ? 'Update & Route' : 'Authorize & Route'}
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>
    </DashboardLayout>
  );
}