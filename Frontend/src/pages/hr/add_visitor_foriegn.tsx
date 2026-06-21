import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, User, CalendarDays, Globe } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';

export default function AddVisitorForeignPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', organization: '', nationality: '',
    purpose: '', visit_date: '', host_id: '', passport_number: '', visa_number: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          organization: formData.organization, nationality: formData.nationality || 'Foreign International',
          id_type: 'Passport', id_number: formData.passport_number
        }]).select().single();

      if (vError) throw vError;

      const { error: visitError } = await supabase.from('visits').insert([{
        visitor_id: visitor.visitor_id, purpose: formData.purpose,
        start_date: formData.visit_date, visit_type: 'FOREIGN',
        status: 'Pending', host_employee_id: formData.host_id
      }]);

      if (visitError) throw visitError;
      navigate('/hr/visitormgmt');
    } catch (err) {
      console.error(err);
      alert('Failed to register diplomatic international manifest.');
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
            <h1 className="text-2xl font-bold text-slate-900">New Registration: <span className="text-orange-600">Foreign National</span></h1>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 shadow-sm flex items-center transition-all">
            {loading ? 'Processing...' : <><Save className="w-4 h-4 mr-2" /> Log Dossier Manifest</>}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><User className="w-4 h-4 mr-2 text-orange-500" /> International Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" required placeholder="Delegate Full Name" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="phone" required placeholder="International Contact Number" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="nationality" required placeholder="Country of Origin / Nationality" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="organization" placeholder="Representing Global Organization" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><Globe className="w-4 h-4 mr-2 text-orange-500" /> Border Control & Passport Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="passport_number" required placeholder="Passport Document Serial ID" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono tracking-wide" />
              <input name="visa_number" required placeholder="Visa Tracking Clearance Number" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono tracking-wide" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><CalendarDays className="w-4 h-4 mr-2 text-purple-500" /> Visit Manifest Intent</h3>
            <div className="space-y-4">
              <textarea name="purpose" required placeholder="Purpose statement of international dispatch..." onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm h-24 font-medium" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="visit_date" type="date" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono" />
                <input name="host_id" required placeholder="Assigned Domestic Sponsor ID" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono" />
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}