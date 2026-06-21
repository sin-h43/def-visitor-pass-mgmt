import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, User, CalendarDays } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';

export default function AddVisitorHRPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', context_type: '', institution: '',
    purpose: '', visit_date: '', host_id: '', id_type: 'National ID Card', id_number: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: visitor, error: vError } = await supabase
        .from('visitors')
        .insert([{
          name: formData.name, phone: formData.phone, email: formData.email,
          organization: formData.institution || 'Internal Evaluation', designation: formData.context_type || 'HR Registry Asset',
          nationality: 'Indian', id_type: formData.id_type, id_number: formData.id_number
        }]).select().single();

      if (vError) throw vError;

      const { error: visitError } = await supabase.from('visits').insert([{
        visitor_id: visitor.visitor_id, purpose: formData.purpose,
        start_date: new Date(formData.visit_date).toISOString(), visit_type: 'HR',
        status: 'Pending', host_employee_id: formData.host_id, pass_type: 'ONE_DAY'
      }]);

      if (visitError) throw visitError;
      navigate('/hr/visitormgmt');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to execute internal HR registry addition.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-4xl mx-auto pb-12 font-sans text-slate-800">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button type="button" onClick={() => navigate(-1)} className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-800 mb-2 transition-colors"><ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back</button>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Registration: <span className="text-amber-600">HR Registry Track</span></h1>
          </div>
          <button type="button" onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 shadow-sm flex items-center transition-all disabled:opacity-50">
            {loading ? 'Processing...' : <><Save className="w-4 h-4 mr-2" /> Commit to HR Ledger</>}
          </button>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><User className="w-4 h-4 mr-2 text-amber-500" /> Candidate / Appointee Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" required placeholder="Candidate Full Name" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-xs font-medium w-full outline-none focus:ring-2 focus:ring-amber-500" />
              <input name="phone" required placeholder="Contact Mobile Line" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono w-full outline-none focus:ring-2 focus:ring-amber-500" />
              <input name="email" required type="email" placeholder="Appointee Email Address" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-xs font-medium w-full outline-none focus:ring-2 focus:ring-amber-500" />
              <select name="context_type" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white w-full outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">Select HR Onboarding Track</option>
                <option value="Interview Candidate">Recruitment / Interview Target</option>
                <option value="Contractor Onboarding">Contracted Workforce Orientation</option>
                <option value="Union Representative">Internal Dispute / Union Counsel</option>
                <option value="Audit Delegate">External Compliance / Benefits Auditor</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><Shield className="w-4 h-4 mr-2 text-amber-500" /> Credential Clearance Token</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="id_type" required placeholder="Identity Document Group Name (e.g., Aadhaar, PAN)" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-xs font-medium w-full outline-none focus:ring-2 focus:ring-amber-500" />
              <input name="id_number" required placeholder="Identity Document Serial ID" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono tracking-wider w-full outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><CalendarDays className="w-4 h-4 mr-2 text-purple-500" /> Interview / Review Context Details</h3>
            <div className="space-y-4">
              <textarea name="purpose" required placeholder="HR Event objective details..." onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium h-24 outline-none focus:ring-2 focus:ring-purple-500" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="visit_date" type="date" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 w-full outline-none" />
                <input name="host_id" required placeholder="Assigned HR Recruiter Officer ID" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono tracking-wide w-full outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}