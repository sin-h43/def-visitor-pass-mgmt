// components/common/RegistrationForm.tsx
import { useState, useEffect } from 'react';
import { UploadCloud, Users, ShieldAlert } from 'lucide-react';

export default function RegistrationForm() {
  const [pipeline, setPipeline] = useState('New Visitor / Urgent Access');
  const [headCount, setHeadCount] = useState<number>(0);
  const [clearance, setClearance] = useState('Level 1');
  const [escorts, setEscorts] = useState<{name: string, govId: string}[]>([]);

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

  return (
    <div className="bg-white border border-slate-400/80 rounded-xl p-8 max-w-4xl shadow-sm">
      <div className="border-b border-slate-400/60 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800">Security Access Registry Form</h2>
        <p className="text-sm text-slate-500 mt-1">Complete all compulsory identity fields to generate an entry pass.</p>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Pipeline Selection */}
        <div className="bg-slate-50 p-4 border border-slate-400/60 rounded-lg">
          <label className="block text-sm font-semibold text-slate-800 mb-2">Pass Processing Pipeline *</label>
          <select 
            value={pipeline}
            onChange={(e) => setPipeline(e.target.value)}
            className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option>New Visitor / Urgent Access</option>
            <option>Pre-Scheduled Visit</option>
            <option>Repeated Visitor</option>
          </select>
        </div>

        {pipeline === 'Pre-Scheduled Visit' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-semibold text-blue-900 mb-1">Requested Arrival Date & Time *</label>
            <input type="datetime-local" className="w-full p-2 border border-blue-300 rounded bg-white text-slate-700" />
          </div>
        )}

        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">A. Primary Base Identity</h4>

        {/* Base Identity Grid (Excluding Escort Counter) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input type="text" placeholder="e.g. Sinchana K" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
            <input type="date" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email ID *</label>
            <input type="email" placeholder="e.g. name@domain.com" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
            <input type="tel" placeholder="+91 9876543210" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Govt Issued ID Ref *</label>
            <input type="text" placeholder="12-Digit Aadhar / PAN" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Address *</label>
            <input type="text" placeholder="House/Office No, Street, City, State, Pincode" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Purpose of Entry / Host Organization *</label>
            <input type="text" placeholder="e.g. Meeting with the Team Lead" className="w-full p-2.5 border border-slate-400/60 rounded-lg bg-white outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* ========================================================
            UNIFIED ESCORT CONTEXT BLOCK (Stacked Direct Elements)
           ======================================================== */}
        <div className="border border-slate-400/60 rounded-xl bg-slate-50/50 overflow-hidden">
          {/* Escort Header & Numeric Selector Box */}
          <div className="p-4 border-b border-slate-400/60 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-800 flex items-center">
                <Users className="w-4 h-4 mr-2 text-slate-500" />
                Accompanying Escort Head Count
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
              className="w-full sm:w-48 p-2 text-sm border border-slate-400/60 rounded-lg bg-white outline-none font-medium focus:border-blue-500" 
            />
          </div>

          {/* Dynamic Row Allocator Output - Attached immediately under the input container */}
          {escorts.length > 0 && (
            <div className="p-4 bg-white border-t border-slate-200 space-y-4">
              <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded w-fit">
                Group Manifest Active: {escorts.length} member profiles required below.
              </div>
              
              {escorts.map((escort, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50/30 relative mt-2">
                  <div className="absolute -left-2.5 -top-2.5 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-xs">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Member Full Name</label>
                    <input 
                      type="text" 
                      value={escort.name}
                      onChange={(e) => handleEscortChange(index, 'name', e.target.value)}
                      placeholder="Enter name" 
                      className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Aadhar / Govt ID Num</label>
                    <input 
                      type="text" 
                      value={escort.govId}
                      onChange={(e) => handleEscortChange(index, 'govId', e.target.value)}
                      placeholder="Enter 12-digit ID" 
                      className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Zone Clearance Level */}
        <div className="pt-4 border-t border-slate-400/60">
          <label className="block text-sm font-semibold text-slate-800 mb-3 flex items-center">
            <ShieldAlert className="w-4 h-4 mr-2 text-slate-500" />
            Assigned Zone Clearance Level
          </label>
          <div className="grid grid-cols-3 gap-4">
            {['Level 1 (Public)', 'Level 2 (Restricted)', 'Level 3 (Classified)'].map((level) => (
              <button
                type="button"
                key={level}
                onClick={() => setClearance(level)}
                className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                  clearance === level 
                  ? level.includes('1') ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : level.includes('2') ? 'bg-amber-50 border-amber-500 text-amber-800'
                    : 'bg-purple-50 border-purple-500 text-purple-800'
                  : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Scan Verification Documents */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-3">Scan Verification Documents</label>
          <div className="border-2 border-dashed border-slate-400/80 rounded-xl p-8 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer mb-6">
            <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
            <span className="font-medium text-slate-700">Drag & Drop or Click to Upload Credentials</span>
            <span className="text-xs mt-1">PDF, PNG, or JPG up to 5MB (Automatic encryption applied)</span>
          </div>

          <div className="flex justify-end gap-4 border-t border-slate-400/60 pt-6">
            <button type="button" className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              Reset Form
            </button>
            <button type="submit" className="px-8 py-2.5 rounded-lg font-medium bg-slate-800 text-white hover:bg-slate-900 shadow-sm transition-colors">
              Submit Application
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}