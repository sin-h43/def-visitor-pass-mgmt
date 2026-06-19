// components/common/RegistrationForm.tsx
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

  // Form State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Field States
  const [pipeline, setPipeline] = useState(prefillData?.pipeline === 'Pre-Scheduled' ? 'Pre-Scheduled Visit' : 'New Visitor / Urgent Access');
  const [scheduledDate, setScheduledDate] = useState('');

  // Visitor Details
  const [visitorName, setVisitorName] = useState(prefillData?.visitorName || '');
  const [dob, setDob] = useState(prefillData?.dob !== 'N/A' ? (prefillData?.dob || '') : '');
  const [email, setEmail] = useState(prefillData?.email !== 'N/A' ? (prefillData?.email || '') : '');
  const [phone, setPhone] = useState(prefillData?.phone !== 'N/A' ? (prefillData?.phone || '+91 ') : '+91 ');
  const [idType, setIdType] = useState(prefillData?.id_type || 'Aadhaar');
  const [idNumber, setIdNumber] = useState(prefillData?.id_number !== 'N/A' ? (prefillData?.id_number || '') : '');
  const [address, setAddress] = useState(prefillData?.address !== 'N/A' ? (prefillData?.address || '') : '');
  const [purpose, setPurpose] = useState(prefillData?.purpose || '');
  const [organization, setOrganization] = useState(prefillData?.organization !== 'N/A' ? (prefillData?.organization || '') : '');
  const [designation, setDesignation] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [department, setDepartment] = useState('');
  // Accompanying Escorts State
  const [headCount, setHeadCount] = useState<number>(0);
  const [escorts, setEscorts] = useState<{name: string, govId: string}[]>([]);

  // Dynamically update Escort rows
  useEffect(() => {
    const count = Math.max(0, Math.min(headCount, 10)); // Cap at 10 rows
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

  // Auto-update phone code when nationality changes
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

      // Insert into visitors table
      const { error: visitorError } = await supabase.from('visitors').insert({
        visitor_id: newVisitorId,
        name: visitorName,
        email: email || null,
        phone: phone,
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

      // Bundle the clearance level and accompanying guests into the purpose string securely
      let finalPurpose = purpose;
      if (escorts.length > 0) {
        const guestList = escorts.map(esc => `${esc.name} (ID: ${esc.govId})`).join(', ');
        finalPurpose += ` | Accompanying: ${guestList}`;
      }

      const dbVisitType = pipeline === 'Pre-Scheduled Visit' ? 'PRESCHEDULED' : (pipeline === 'Repeated Visitor' ? 'REPEATED' : 'IMMEDIATE');
      const startDate = pipeline === 'Pre-Scheduled Visit' && scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString();

      // Insert into visits table
      const { error: visitError } = await supabase.from('visits').insert({
        visit_id: newVisitId,
        visitor_id: newVisitorId,
        host_employee_id: 'EMP001', // Hardcoded for your testing
        created_by_employee_id: 'EMP001',
        visit_type: dbVisitType,
        pass_type: 'ONE_DAY',
        purpose: finalPurpose,
        start_date: startDate,
        end_date: startDate,
        status: 'Pending'
      });

      if (visitError) throw visitError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/emp');
      }, 2000);

    } catch (err: any) {
      console.error('Registration Error:', err);
      setError(err.message || 'Failed to securely process entry pass.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 max-w-4xl shadow-sm text-center animate-fade-in">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">Clearance Registration Successful</h2>
        <p className="text-emerald-600">The identity matrix and entry pass have been securely logged.</p>
        <p className="text-sm text-emerald-500 mt-4">Routing back to Terminal Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 max-w-4xl shadow-sm">
      <div className="border-b border-slate-200 pb-2 mb-4">
        <h2 className="text-xl font-bold text-slate-800">Security Access Registry Form</h2>
        <p className="text-sm text-slate-500 mt-1">Complete all compulsory identity fields to generate an entry pass.</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <form className="space-y-2" onSubmit={handleSubmit}>
        {/* Pipeline Selection */}
        <div className="bg-slate-50 p-3 border border-slate-200 rounded-lg">
          <label className="block text-sm font-semibold text-slate-800 mb-1">Pass Processing Pipeline *</label>
          <select 
            required
            value={pipeline}
            onChange={(e) => setPipeline(e.target.value)}
            className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option>New Visitor / Urgent Access</option>
            <option>Pre-Scheduled Visit</option>
            <option>Repeated Visitor</option>
          </select>
        </div>
        <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Target Department *</label>
            <select 
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {/* UPDATED DEPARTMENT OPTIONS */}
              <option value="Research Wing">Research Wing</option>
              <option value="IT Department">IT Department</option>
              <option value="Operations">Operations</option>
              <option value="Logistics">Logistics</option>
              <option value="HR Department">HR Department</option>
            </select>
          </div>

        {pipeline === 'Pre-Scheduled Visit' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-semibold text-blue-900 mb-1">Requested Arrival Date & Time *</label>
            <input 
              required
              type="datetime-local" 
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full p-2 border border-blue-300 rounded bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
        )}

        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4">A. Primary Base Identity</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input required type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} placeholder="e.g. Rahul Verma" className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nationality *</label>
              <select value={nationality} onChange={handleNationalityChange} className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500">
                {NATIONALITIES.map(nat => (
                  <option key={nat.label} value={nat.label}>{nat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
              <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500 font-mono text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500 text-slate-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. name@domain.com" className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Type *</label>
              <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500">
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="PAN">PAN Card</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Passport">Passport</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Govt Issued ID Number *</label>
              <input required type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter Document ID Number" className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500 uppercase font-mono text-sm" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House/Office No, Street, City, State, Pincode" className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organization / Company</label>
            <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. Defence Research Ltd." className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Lead Auditor" className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Purpose of Entry *</label>
            <input required type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Scheduled IT Infrastructure Maintenance" className="w-full p-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Accompanying Escort Context Block */}
        <div className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden mt-4">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-800 flex items-center">
                <Users className="w-4 h-4 mr-2 text-slate-500" />
                Accompanying Guest Head Count
              </label>
              <p className="text-xs text-slate-500 mt-0.5">Specify group additions under your unified entry clearance.</p>
            </div>
            <input 
              type="number" 
              min="0"
              max="10"
              value={headCount || ''}
              onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)}
              placeholder="0 (Single Personnel)" 
              className="w-full sm:w-48 p-2 text-sm border border-slate-300 rounded-lg bg-white outline-none font-medium focus:border-blue-500" 
            />
          </div>

          {escorts.length > 0 && (
            <div className="p-4 bg-white border-t border-slate-200 space-y-4">
              <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded w-fit">
                Group Manifest Active: {escorts.length} member profiles required below.
              </div>
              
              {escorts.map((escort, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50/30 relative mt-2">
                  <div className="absolute -left-2.5 -top-2.5 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Member Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={escort.name}
                      onChange={(e) => handleEscortChange(index, 'name', e.target.value)}
                      placeholder="Enter name" 
                      className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Govt ID Number</label>
                    <input 
                      required
                      type="text" 
                      value={escort.govId}
                      onChange={(e) => handleEscortChange(index, 'govId', e.target.value)}
                      placeholder="Enter Document ID" 
                      className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500 font-mono" 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Scan Verification Documents */}
        <div className="pt-6 border-t border-slate-200">
          <label className="block text-sm font-semibold text-slate-800 mb-3">Upload Verification Documents</label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer mb-6">
            <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
            <span className="font-medium text-slate-700 text-sm">Drag & Drop or Click to Upload Credentials</span>
            <span className="text-xs mt-1">PDF, PNG, or JPG up to 5MB (Automatic encryption applied)</span>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/emp')}
              className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-2.5 rounded-lg font-medium bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-colors text-sm disabled:opacity-50 flex items-center"
            >
              {loading ? 'Processing Ledger...' : 'Submit Application'}
            </button>
          </div>
        </div>
      </form>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}} />
    </div>
  );
}