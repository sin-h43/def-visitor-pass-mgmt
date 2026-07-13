import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RegistrationForm from '../../components/common/RegistrationForm';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';

export default function AddVisitorGeneralPage() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState({ name: 'Loading...', avatarUrl: '' });

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return;
        const employee = await fetchAndVerifyEmployee(user.email);
        if (employee) {
          setCurrentUser({
            name: employee.name,
            avatarUrl: employee.avatar_url || ''
          });
        }
      } catch (err) {
        console.error('Failed to load HOD profile:', err);
        setCurrentUser({ name: 'HOD Admin', avatarUrl: '' });
      }
    };
    loadUserProfile();
  }, []);

  return (
    <DashboardLayout role="hr" userName={currentUser.name || 'HOD Officer'} avatarUrl={currentUser.avatarUrl || ''}>
      <div className="max-w-4xl mx-auto pb-12 font-sans">
        
        {/* Navigation Breadcrumb Row */}
        <div className="mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
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