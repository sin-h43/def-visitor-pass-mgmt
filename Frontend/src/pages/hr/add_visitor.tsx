// pages/hr/add_visitor.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Users, ShieldAlert, Globe, Landmark, Briefcase, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function HRAddVisitorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Normalize parameters to reliably match conditional blocks
  const categoryParam = searchParams.get('category') || 'general';
  const formalizedCategory = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1).toLowerCase();
  const normalizedMatch = categoryParam.toLowerCase();

  // Processing configuration states
  const [pipeline, setPipeline] = useState('Immediate Access / Live Walk-in');
  const [headCount, setHeadCount] = useState<number>(0);
  const [clearance, setClearance] = useState('Level 1 (Public)');
  const [escorts, setEscorts] = useState<{ name: string; govId: string }[]>([]);

  // Category-Specific Extra Fields State
  const [passportNumber, setPassportNumber] = useState('');
  const [visaNumber, setVisaNumber] = useState('');
  const [visaExpiry, setVisaExpiry] = useState('');
  const [nationality, setNationality] = useState('');
  const [govtAgency, setGovtAgency] = useState('');
  const [clearanceId, setClearanceId] = useState('');
  const [serviceVendor, setServiceVendor] = useState('');
  const [workOrderRef, setWorkOrderRef] = useState('');

  // Auto-generate escort contingent inputs based on headcount changes
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

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Action Header */}
        <div>
          <button 
            onClick={() => navigate('/hr/visitormgmt')}
            className="flex items-center text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors mb-2 border border-slate-300 bg-white px-3 py-1.5 rounded-lg shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Clearance Management
          </button>
          <h1 className="text-2xl font-bold text-slate-800 mt-4">
            Onboarding Track: <span className="text-blue-600 font-extrabold">{formalizedCategory} Pass</span>
          </h1>
        </div>

        {/* Master Registry Form Card */}
        <div className="bg-white border border-slate-400/80 rounded-xl p-8 shadow-sm">
          
          <div className="border-b border-slate-400/60 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800">Security Access Registry Form</h2>
            <p className="text-xs text-slate-500 mt-1">Deploying baseline identity rules combined with specialized {formalizedCategory} tracking parameters.</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            
            {/* Pipeline Configuration Control */}
            <div className="bg-slate-50 p-4 border border-slate-400/60 rounded-lg">
              <label className="block text-sm font-bold text-slate-700 mb-2">Pass Processing Variant Type *</label>
              <select 
                value={pipeline}
                onChange={(e) => setPipeline(e.target.value)}
                className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Immediate Access / Live Walk-in">Immediate Access / Live Walk-in</option>
                <option value="Pre-Scheduled Visit Pipeline">Pre-Scheduled Visit Pipeline</option>
                <option value="Repeated Framework Profile">Repeated Framework Profile</option>
              </select>
            </div>

            {/* Conditional Pre-Scheduled Input Box */}
            {pipeline === 'Pre-Scheduled Visit Pipeline' && (
              <div className="p-4 bg-blue-50/50 border border-blue-300 rounded-lg animate-fade-in">
                <label className="block text-sm font-bold text-blue-900 mb-1">Requested Arrival Date & Time *</label>
                <input 
                  type="datetime-local" 
                  className="w-full p-2.5 border border-blue-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            )}

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">A. Compulsory Base Identity Data</h4>
            
            {/* Identity Field Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Legal Name *</label>
                <input type="text" placeholder="e.g. Sarah Jenkins" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                <input type="date" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm text-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone Number *</label>
                <input type="tel" placeholder="Include country codes if applicable" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                <input type="email" placeholder="name@domain.com" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Govt Issued ID Reference *</label>
                <input type="text" placeholder="12-Digit Aadhaar / Passport / Identity Token" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Accompanying Escort Head Count</label>
                <input 
                  type="number" 
                  min="0"
                  max="15"
                  value={headCount || ''}
                  onChange={(e) => setHeadCount(parseInt(e.target.value) || 0)}
                  placeholder="0 (Single Personnel Access)" 
                  className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Residence Address *</label>
                <input type="text" placeholder="House/Office No, Street, City, State, Pincode" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>

              {/* ========================================================
                  DYNAMIC REQUISITE SECTION: SPECIALIZED FORMS
              ======================================================== */}
              {normalizedMatch === 'foreign' && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-orange-50/40 border border-orange-300 rounded-xl space-y-1 md:space-y-0 animate-fade-in">
                  <div className="md:col-span-2 flex items-center space-x-2 text-orange-800 font-bold text-sm border-b border-orange-200 pb-2 mb-2">
                    <Globe className="w-4 h-4 text-orange-600" />
                    <span>Sovereign Passport & Visa Credential Tracking</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-900 uppercase mb-1">Nationality / Issuing State *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. United Kingdom" 
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full p-2.5 border border-orange-300 rounded-lg bg-white focus:ring-1 focus:ring-orange-500 text-sm outline-none font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-900 uppercase mb-1">Passport Serial Number *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. GBR902183" 
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      className="w-full p-2.5 border border-orange-300 rounded-lg bg-white focus:ring-1 focus:ring-orange-500 text-sm outline-none font-mono uppercase" 
                    />
                  </div>
                  <div className="pt-3 md:pt-0">
                    <label className="block text-xs font-bold text-orange-900 uppercase mb-1">Visa Reference Number *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. V-293810" 
                      value={visaNumber}
                      onChange={(e) => setVisaNumber(e.target.value)}
                      className="w-full p-2.5 border border-orange-300 rounded-lg bg-white focus:ring-1 focus:ring-orange-500 text-sm outline-none font-mono" 
                    />
                  </div>
                  <div className="pt-3 md:pt-0">
                    <label className="block text-xs font-bold text-orange-900 uppercase mb-1">Visa Validation Expiry Date *</label>
                    <input 
                      type="date" 
                      value={visaExpiry}
                      onChange={(e) => setVisaExpiry(e.target.value)}
                      className="w-full p-2.5 border border-orange-300 rounded-lg bg-white focus:ring-1 focus:ring-orange-500 text-sm outline-none text-slate-700" 
                    />
                  </div>
                </div>
              )}

              {normalizedMatch === 'govt' && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-purple-50/40 border border-purple-300 rounded-xl animate-fade-in">
                  <div className="md:col-span-2 flex items-center space-x-2 text-purple-800 font-bold text-sm border-b border-purple-200 pb-2 mb-2">
                    <Landmark className="w-4 h-4 text-purple-600" />
                    <span>Official Ministry / Agency Credentials Command</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-900 uppercase mb-1">Department / Agency Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DRDO / Ministry of Defence" 
                      value={govtAgency}
                      onChange={(e) => setGovtAgency(e.target.value)}
                      className="w-full p-2.5 border border-purple-300 rounded-lg bg-white focus:ring-1 focus:ring-purple-500 text-sm outline-none font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-900 uppercase mb-1">Government ID / Clearance Batch Ref *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. GOV-SEC-998" 
                      value={clearanceId}
                      onChange={(e) => setClearanceId(e.target.value)}
                      className="w-full p-2.5 border border-purple-300 rounded-lg bg-white focus:ring-1 focus:ring-purple-500 text-sm outline-none font-mono uppercase" 
                    />
                  </div>
                </div>
              )}

              {normalizedMatch === 'service' && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-emerald-50/40 border border-emerald-300 rounded-xl animate-fade-in">
                  <div className="md:col-span-2 flex items-center space-x-2 text-emerald-800 font-bold text-sm border-b border-emerald-200 pb-2 mb-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span>Corporate Vendor / Plant Service Manifest</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Contractor / Firm Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Siemens Facilities Management" 
                      value={serviceVendor}
                      onChange={(e) => setServiceVendor(e.target.value)}
                      className="w-full p-2.5 border border-emerald-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 text-sm outline-none font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Work Order / Maintenance ID Ref *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. WO-2026-881" 
                      value={workOrderRef}
                      onChange={(e) => setWorkOrderRef(e.target.value)}
                      className="w-full p-2.5 border border-emerald-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 text-sm outline-none font-mono uppercase" 
                    />
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose of Visit / Protocol Target Objective *</label>
                <textarea rows={2} placeholder="State structural reasons for facility checkpoint entry clearly..." className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>

            {/* Dynamic Group Escort Component Manifest */}
            {escorts.length > 0 && (
              <div className="border border-slate-400/80 rounded-xl overflow-hidden animate-fade-in">
                <div className="bg-slate-100 p-3.5 border-b border-slate-400/60 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm flex items-center">
                    <Users className="w-4 h-4 mr-2 text-slate-500" />
                    Escorted Contingent Manifest
                  </span>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                    {escorts.length} Accompanying Rows Generated
                  </span>
                </div>
                <div className="p-4 space-y-4 bg-slate-50/50 max-h-[300px] overflow-y-auto">
                  {escorts.map((escort, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-300 rounded-lg bg-white relative pt-5">
                      <div className="absolute -left-2.5 -top-2.5 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Personnel Full Name</label>
                        <input 
                          type="text" 
                          value={escort.name}
                          onChange={(e) => handleEscortChange(index, 'name', e.target.value)}
                          placeholder="Enter legal name" 
                          className="w-full p-2 text-sm border border-slate-300 rounded-md bg-slate-50 focus:bg-white outline-none font-medium" 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Govt ID / Passport Ref</label>
                        <input 
                          type="text" 
                          value={escort.govId}
                          onChange={(e) => handleEscortChange(index, 'govId', e.target.value)}
                          placeholder="Enter validation code" 
                          className="w-full p-2 text-sm border border-slate-300 rounded-md bg-slate-50 focus:bg-white outline-none font-medium font-mono" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Zone Area Clearance Selection */}
            <div className="pt-4 border-t border-slate-400/60">
              <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center">
                <ShieldAlert className="w-4.5 h-4.5 mr-2 text-slate-500" />
                Assigned Zone Area Clearance Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['Level 1 (Public)', 'Level 2 (Restricted)', 'Level 3 (Classified)'].map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setClearance(level)}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                      clearance === level 
                      ? level.includes('1') ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : level.includes('2') ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
                        : 'bg-purple-50 border-purple-500 text-purple-800 shadow-sm'
                      : 'bg-white border-slate-300 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Verification Block */}
            <div className="pt-4">
              <label className="block text-sm font-bold text-slate-800 mb-3">
                Scan Verification Documentation {normalizedMatch === 'foreign' && '(Passport & Visa Copies Required)'}
              </label>
              <div className="border-2 border-dashed border-slate-400/80 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-500 transition-all cursor-pointer">
                <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Drag & Drop or Click to Scan Identifications</span>
                <span className="text-xs text-slate-400 mt-1">Acceptable formats: PDF, PNG, JPG up to 5MB</span>
              </div>
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
                onClick={() => alert(`Authorized ${formalizedCategory} profile routed to main authorization queue.`)}
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 shadow-sm transition-colors flex items-center"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Authorize & Route
              </button>
            </div>

          </form>
        </div>

      </div>
    </DashboardLayout>
  );
}