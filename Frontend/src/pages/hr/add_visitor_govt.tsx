import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, User, CalendarDays, Landmark } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';

export default function AddVisitorGovtPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', organization: '', designation: '',
    purpose: '', visit_date: '', host_id: '', govt_id_type: '', govt_id_number: ''
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
          organization: formData.organization || 'Ministry Office', designation: formData.designation,
          nationality: 'Indian', id_type: formData.govt_id_type, id_number: formData.govt_id_number
        }]).select().single();

      if (vError) throw vError;

      const { error: visitError } = await supabase.from('visits').insert([{
        visitor_id: visitor.visitor_id, purpose: formData.purpose,
        start_date: formData.visit_date, visit_type: 'GOVT',
        status: 'Pending', host_employee_id: formData.host_id
      }]);

      if (visitError) throw visitError;
      navigate('/hr/visitormgmt');
    } catch (err) {
      console.error(err);
      alert('Failed to process secure government asset.');
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
            <h1 className="text-2xl font-bold text-slate-900">New Registration: <span className="text-purple-600">Govt / Defense Track</span></h1>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-sm flex items-center transition-all">
            {loading ? 'Processing...' : <><Save className="w-4 h-4 mr-2" /> Authorize & Save</>}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><User className="w-4 h-4 mr-2 text-purple-500" /> Official Personnel Profiles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" required placeholder="Official Full Name" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="phone" required placeholder="Official Mobile Network" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="organization" placeholder="Ministry / Department / Command" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="designation" placeholder="Official Designation / Rank" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><Landmark className="w-4 h-4 mr-2 text-amber-500" /> Government Clearance Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select name="govt_id_type" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select Government ID Type</option>
                <option value="Defense ID Card">Defense ID / Armed Forces Card</option>
                <option value="Ministry Secretarial Token">Ministry Secretarial Token</option>
                <option value="Government Gazetted Pass">Government Gazetted Pass</option>
                <option value="Diplomatic Credentials">Diplomatic Credentials</option>
              </select>
              <input name="govt_id_number" required placeholder="Government ID / Serial Number" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono tracking-wide outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><CalendarDays className="w-4 h-4 mr-2 text-purple-500" /> Official Assignment Constraints</h3>
            <div className="space-y-4">
              <textarea name="purpose" required placeholder="Operational brief or purpose description..." onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm h-24 font-medium" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="visit_date" type="date" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-mono font-bold" />
                <input name="host_id" required placeholder="Internal Sponsor Personnel ID" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-mono font-bold" />
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}