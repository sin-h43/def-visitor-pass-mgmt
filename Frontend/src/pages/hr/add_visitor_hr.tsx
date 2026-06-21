import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, User, CalendarDays } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';

export default function AddVisitorHRPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
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
        start_date: formData.visit_date, visit_type: 'HR',
        status: 'Pending', host_employee_id: formData.host_id
      }]);

      if (visitError) throw visitError;
      navigate('/hr/visitormgmt');
    } catch (err) {
      console.error(err);
      alert('Failed to execute internal HR registry addition.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-4xl mx-auto pb-12 font-sans">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 mb-2"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back</button>
            <h1 className="text-2xl font-bold text-slate-900">New Registration: <span className="text-amber-600">HR Registry Track</span></h1>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 shadow-sm flex items-center transition-all">
            {loading ? 'Processing...' : <><Save className="w-4 h-4 mr-2" /> Commit to HR Ledger</>}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><User className="w-4 h-4 mr-2 text-amber-500" /> Candidate / Appointee Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" required placeholder="Candidate Full Name" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="phone" required placeholder="Contact Mobile Line" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="email" required placeholder="Appointee Email Address" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <select name="context_type" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full bg-white font-medium text-slate-700 outline-none">
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
              <input name="id_type" required placeholder="Identity Document Group Name (e.g., Aadhaar)" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="id_number" required placeholder="Identity Document Serial ID" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono tracking-wide" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><CalendarDays className="w-4 h-4 mr-2 text-purple-500" /> Interview / Review Context Details</h3>
            <div className="space-y-4">
              <textarea name="purpose" required placeholder="HR Event objective details..." onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm h-24 font-medium" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="visit_date" type="date" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono" />
                <input name="host_id" required placeholder="Assigned HR Recruiter Officer ID" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono" />
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}