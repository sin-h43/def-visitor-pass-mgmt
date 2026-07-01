// src/pages/auth/unauthorized.tsx
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Unauthorized() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-[800px] h-[800px] bg-red-100 rounded-full blur-3xl absolute top-[-20%] left-[-10%]"></div>
      </div>

      <div className="z-10 text-center flex flex-col items-center w-full max-w-md">
        
        {/* Slate-900 Icon Block */}
        <div className="w-20 h-20 bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center transform -rotate-3 mb-6">
          <ShieldAlert className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
          Clearance Denied
        </h1>
        
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 w-full mb-6 text-left">
          <p className="text-slate-700 text-sm font-medium leading-relaxed mb-4">
            Your credentials are <strong className="text-emerald-600">valid</strong> and you logged in successfully, but your account does not have the required role permissions to access this specific terminal.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-slate-500 text-xs leading-relaxed">
              <strong>Possible reasons:</strong><br/>
              • Your account is still pending HR approval.<br/>
              • You are trying to access a dashboard outside your department.<br/>
              • Your role hasn't synced properly in the database.
            </p>
          </div>
        </div>

        <Link
          to="/login"
          onClick={handleSignOut}
          className="w-full inline-flex items-center justify-center py-3.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Sign Out & Return to Login
        </Link>
        
      </div>
    </div>
  );
}