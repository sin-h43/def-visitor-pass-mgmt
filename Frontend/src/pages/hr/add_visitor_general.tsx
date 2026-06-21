import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RegistrationForm from '../../components/common/RegistrationForm';

export default function AddVisitorGeneralPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-4xl mx-auto pb-12 font-sans">
        
        {/* Navigation Breadcrumb Row */}
        <div className="mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Operational Manifest
          </button>
        </div>

        {/* Embedded Core Registration Terminal */}
        <RegistrationForm />
        
      </div>
    </DashboardLayout>
  );
}