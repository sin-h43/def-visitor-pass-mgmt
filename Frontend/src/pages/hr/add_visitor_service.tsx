import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, User, CalendarDays, Wrench } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';

export default function AddVisitorServicePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', contracting_company: '', trade_type: '',
    purpose: '', visit_date: '', host_id: '', id_type: 'Business Vendor ID', id_number: ''
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
          organization: formData.contracting_company, designation: formData.trade_type || 'Service Vendor',
          nationality: 'Indian', id_type: formData.id_type, id_number: formData.id_number
        }]).select().single();

      if (vError) throw vError;

      const { error: visitError } = await supabase.from('visits').insert([{
        visitor_id: visitor.visitor_id, purpose: formData.purpose,
        start_date: formData.visit_date, visit_type: 'SERVICE',
        status: 'Pending', host_employee_id: formData.host_id
      }]);

      if (visitError) throw visitError;
      navigate('/hr/visitormgmt');
    } catch (err) {
      console.error(err);
      alert('Failed to log vendor service manifest.');
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
            <h1 className="text-2xl font-bold text-slate-900">New Registration: <span className="text-emerald-600">Service / Vendor Track</span></h1>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-sm flex items-center transition-all">
            {loading ? 'Processing...' : <><Save className="w-4 h-4 mr-2" /> Log Vendor Access</>}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><User className="w-4 h-4 mr-2 text-emerald-500" /> Technician / Representative Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" required placeholder="Technician Full Name" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="phone" required placeholder="Contact Mobile Line" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <input name="contracting_company" required placeholder="Contracting Agency / Employer" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-medium" />
              <select name="trade_type" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full bg-white font-medium text-slate-700 outline-none">
                <option value="">Select Field Trade / Classification</option>
                <option value="Facilities Maintenance">Facilities & Infrastructure Maintenance</option>
                <option value="IT Equipment Delivery">IT Infrastructure Hardware Vendor</option>
                <option value="Catering Logistics">Catering & Logistics Vendor</option>
                <option value="Outsourced Security Asset">Outsourced Security Asset</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><Wrench className="w-4 h-4 mr-2 text-amber-500" /> Contractor Authorization Verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select name="id_type" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full bg-white font-medium text-slate-700 outline-none">
                <option value="Business Vendor ID">Corporate Work Badge / Vendor ID</option>
                <option value="Labor Token Certificate">Labor Token Certificate</option>
                <option value="Aadhaar National ID">Aadhaar National ID</option>
              </select>
              <input name="id_number" required placeholder="Credential Asset Serial Number" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono tracking-wide" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-5"><CalendarDays className="w-4 h-4 mr-2 text-purple-500" /> Assignment Purpose & Targets</h3>
            <div className="space-y-4">
              <textarea name="purpose" required placeholder="Scope of work description..." onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm h-24 font-medium" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="visit_date" type="date" required onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono" />
                <input name="host_id" required placeholder="Supervising Plant Host ID" onChange={handleChange} className="p-2.5 border border-slate-200 rounded-xl text-sm w-full font-bold font-mono" />
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}