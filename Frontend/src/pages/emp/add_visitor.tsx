// pages/emp/add_visitor.tsx
import DashboardLayout from '../../components/layout/DashboardLayout';
import RegistrationForm from '../../components/common/RegistrationForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmpNotificationCenter from '../../components/common/empNotificationCenter';
import { useState, useEffect } from 'react';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';
import { supabase } from '../../lib/supabase';

export default function AddVisitorPage() {

  const [currentUser, setCurrentUser] = useState({ name: 'Loading...', avatarUrl: '' });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          const emp = await  fetchAndVerifyEmployee(user.email);
          setCurrentUser({ name: emp.name, avatarUrl: emp.avatar_url || '' });
        } catch (error) {
          console.error("Failed to load employee identity", error);
          setCurrentUser({ name: 'Employee', avatarUrl: '' }); // Fallback if it fails
        }
      }
    };
    fetchUser();
  }, []);
  
  return (
    <DashboardLayout role="emp" userName={currentUser.name} headerAction={<EmpNotificationCenter />} avatarUrl={currentUser.avatarUrl || ''}>
      <div className="max-w-4xl mx-auto">
        
        {/* Page Navigation/Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/emp" className="flex items-center text-slate-500 hover:text-slate-800 mb-2 transition-colors w-fit outline-none">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">Add New Visitor</h1>
          </div>
        </div>

        {/* The Reusable Form */}
        <RegistrationForm />
        
      </div>
    </DashboardLayout>
  );
}