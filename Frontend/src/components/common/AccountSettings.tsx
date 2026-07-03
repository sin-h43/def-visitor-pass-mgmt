import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LogOut, Mail, IdCard, Building2, ShieldCheck, Clock, Badge } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchAndVerifyEmployee, type EmployeeRecord } from '../../lib/employeeUtils';
import DashboardLayout from '../layout/DashboardLayout';
import { useNotification } from '../../hooks/useNotification';
import NotificationToast from './NotificationToast';

interface AccountSettingsProps {
  role: 'emp' | 'hr' | 'security';
  headerAction?: React.ReactNode;
}

const ROLE_LABELS: Record<AccountSettingsProps['role'], string> = {
  emp: 'Core Entry Console',
  hr: 'HR Officer',
  security: 'Security Operations',
};

export default function AccountSettings({ role, headerAction }: AccountSettingsProps) {
  const navigate = useNavigate();
  const { notifications, addNotification, removeNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return;
        setLastSignIn(user.last_sign_in_at || null);
        const emp = await fetchAndVerifyEmployee(user.email);
        setEmployee(emp);
      } catch (err) {
        console.error('Failed to load account:', err);
        addNotification('error', 'Unable to load your account details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Please select an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      addNotification('error', 'Image must be smaller than 3MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${employee.employee_id || employee.id}_avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('employees')
        .update({ avatar_url: avatarUrl })
        .eq('id', employee.id);
      if (updateError) throw updateError;

      setEmployee(prev => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      addNotification('success', 'Profile picture updated.');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      addNotification('error', 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login'); // ✅ Safely kicks them out to the login screen
  };

  if (loading) {
    return (
      <DashboardLayout role={role} userName="Loading..." headerAction={headerAction}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-full mb-4"></div>
            <p className="text-slate-500 font-medium">Loading account settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role} userName={employee?.name || 'User'} headerAction={headerAction} avatarUrl={employee?.avatar_url}>
      <div className="max-w-3xl mx-auto space-y-6">

        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your profile picture and session.</p>
        </div>

        {/* Profile Picture Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-5 flex items-center">
            <Camera className="w-4 h-4 mr-2 text-blue-600" /> Profile Picture
          </h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              {employee && 'avatar_url' in employee && employee.avatar_url && typeof employee.avatar_url === 'string' ? (
                <img
                  src={employee.avatar_url}
                  alt={employee.name}
                  className="w-20 h-20 rounded-full object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl">
                  {(employee?.name || 'U').charAt(0)}
                </div>
              )}
            </div>
            <div>
              <button
                onClick={handlePickPhoto}
                disabled={uploading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
              <p className="text-[11px] text-slate-400 mt-2">JPG or PNG, up to 3MB.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          </div>
        </div>

        {/* Read-Only Account Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
            <IdCard className="w-4 h-4 mr-2 text-blue-600" /> Account Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500 flex items-center"><Badge className="w-3.5 h-3.5 mr-1.5" /> Employee ID</span>
              <span className="col-span-2 font-medium text-slate-900">{employee?.employee_id || 'N/A'}</span>
            </div>            
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500 flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5" /> Email</span>
              <span className="col-span-2 font-medium text-slate-900">{employee?.email || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500 flex items-center"><Building2 className="w-3.5 h-3.5 mr-1.5" /> Department</span>
              <span className="col-span-2 font-medium text-slate-900">{employee?.department || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500 flex items-center"><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Role</span>
              <span className="col-span-2 font-medium text-slate-900">{ROLE_LABELS[role]}</span>
            </div>
            {lastSignIn && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5" /> Last Login</span>
                <span className="col-span-2 font-medium text-slate-900">
                  {new Date(lastSignIn).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Logout Zone */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
            <LogOut className="w-4 h-4 mr-2 text-red-500" /> Session
          </h3>
          <p className="text-xs text-slate-500 mb-4">Sign out of this device. You'll need to log in again to access the portal.</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-red-50 text-red-700 font-bold text-xs rounded-xl hover:bg-red-100 border border-red-100 transition-colors flex items-center"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" /> Log Out
          </button>
        </div>

      </div>

      <NotificationToast notifications={notifications} onRemove={removeNotification} />
    </DashboardLayout>
  );
}