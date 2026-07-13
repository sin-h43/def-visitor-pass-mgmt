// File: src/pages/auth/login.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Shield, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned');

      // 2. Determine User Role from our unified view
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (roleError || !roleData) {
        // If they authenticated but have no role, they might be pending approval
        await supabase.auth.signOut();
        throw new Error('Account pending HR approval or role missing.');
      }

      // 3. Route to the correct dashboard
      switch (roleData.role) {
        case 'hr':
          navigate('/hod');
          break;
        case 'security':
          navigate('/security');
          break;
        case 'employee':
          navigate('/emp');
          break;
        default:
          throw new Error('Invalid role assignment');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-[800px] h-[800px] bg-blue-100 rounded-full blur-3xl absolute top-[-20%] left-[-10%]"></div>
        <div className="w-[600px] h-[600px] bg-slate-200 rounded-full blur-3xl absolute bottom-[-10%] right-[-5%]"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="mx-auto w-16 h-16 bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center transform -rotate-3">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-slate-900 tracking-tight">
          Secure Access
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          Defence Visitor Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In to Terminal'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Need an employee account?{' '}
              <Link to="/register" className="font-bold text-blue-500 hover:text-blue-500 transition-colors">
                Request access here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}