import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// --- Auth Pages ---
import Login from './pages/auth/login';
import Register from './pages/auth/register'; // We will build this next
// import PendingApproval from './pages/auth/pending'; // We will build this next
// import Unauthorized from './pages/auth/unauthorized'; // We will build this next

// --- Employee Pages ---
import EmployeeDashboard from './pages/emp/index';
import AddVisitorPage from './pages/emp/add_visitor';
import RepeatedVisitorPage from './pages/emp/repeated_visitor';
import DispatchedLogsPage from './pages/emp/dispatchedLogs';

// --- HR Pages ---
import HRDashboard from './pages/hr/index';
import VisitorMgmtPage from './pages/hr/visitormgmt';
import HRAddVisitorPage from './pages/hr/add_visitor_general';
import AnalyticsPage from './pages/hr/analytics';
import AuditPage from './pages/hr/audit';
import HRRepeatedVisitorLogPage from './pages/hr/hr_repeated_visitor';
import AddVisitorGeneralPage from './pages/hr/add_visitor_general';
import AddVisitorForeignPage from './pages/hr/add_visitor_foriegn';
import AddVisitorGovtPage from './pages/hr/add_visitor_govt';
import AddVisitorHRPage from './pages/hr/add_visitor_hr';
import AddVisitorServicePage from './pages/hr/add_visitor_service';
import EnterpriseVisitorProfile from './pages/hr/EnterpriseVisitorProfile';
// import RegistrationManagement from './pages/hr/registration_management'; // We will build this for HR to approve users
import Unauthorized from './pages/auth/unauthorized';

// --- Security Pages ---
import SecurityDashboard from './pages/security';
import VisitorVerification from './pages/security/visitor_verification';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: string;
  userRole: string | null;
  isLoading: boolean;
}
 
function ProtectedRoute({ children, requiredRole, userRole, isLoading }: ProtectedRouteProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    );
  }
 
  // If not logged in at all
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // If waiting for HR approval
  if (userRole === 'pending' && requiredRole !== 'pending') {
    return <Navigate to="/pending" replace />;
  }
 
  // If trying to access a page they don't have permission for
  if (userRole !== requiredRole && requiredRole !== 'all') {
    return <Navigate to="/unauthorized" replace />;
  }
 
  return <>{children}</>;
}

export default function App() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
 
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // 1. Check if they have an approved role in our secure view
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          if (roleData) {
            setUserRole(roleData.role); // 'hr', 'employee', or 'security'
          } else {
            // 2. If no role, check if they are an employee pending HR approval
            const { data: pendingData } = await supabase
              .from('employee_registrations')
              .select('status')
              .eq('email', user.email)
              .single();

            if (pendingData?.status === 'pending') {
              setUserRole('pending');
            } else {
              setUserRole('unauthorized');
            }
          }
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };
 
    checkAuth();

    // Listen for auth changes (like logging in/out)
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setIsLoading(true);
      checkAuth();
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  // Temporary dummy components for missing auth pages until we build them
  const DummyPage = ({ title }: { title: string }) => (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center"><h1 className="text-2xl font-bold">{title}</h1><p className="text-slate-500">Component pending creation</p></div>
    </div>
  );

  return (
    <Router>
      <Routes>
        
        {/*PUBLIC & AUTH ROUTES*/}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={!userRole ? <Login /> : <Navigate to={`/${userRole === 'employee' ? 'emp' : userRole}`} replace />} />
        <Route path="/register" element={<Register/>} />
        <Route path="/pending" element={<DummyPage title="Pending HR Approval" />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/*EMPLOYEE PORTAL ROUTES*/}
        <Route path="/emp" element={<ProtectedRoute requiredRole="employee" userRole={userRole} isLoading={isLoading}><EmployeeDashboard /></ProtectedRoute>} />
        <Route path="/emp/add_visitor" element={<ProtectedRoute requiredRole="employee" userRole={userRole} isLoading={isLoading}><AddVisitorPage /></ProtectedRoute>} />
        <Route path="/emp/repeated_visitor" element={<ProtectedRoute requiredRole="employee" userRole={userRole} isLoading={isLoading}><RepeatedVisitorPage /></ProtectedRoute>} />
        <Route path="/emp/dispatchedlogs" element={<ProtectedRoute requiredRole="employee" userRole={userRole} isLoading={isLoading}><DispatchedLogsPage /></ProtectedRoute>} />
        <Route path="/emp/settings" element={<ProtectedRoute requiredRole="employee" userRole={userRole} isLoading={isLoading}><div className="p-8">Employee Settings (Coming Soon)</div></ProtectedRoute>} />


        {/*HR PORTAL ROUTES */}
        <Route path="/hr" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><HRDashboard /></ProtectedRoute>} />
        <Route path="/hr/visitormgmt" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><VisitorMgmtPage /></ProtectedRoute>} />
        <Route path="/hr/add_visitor" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><HRAddVisitorPage /></ProtectedRoute>} />
        <Route path="/hr/hrrep" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><HRRepeatedVisitorLogPage /></ProtectedRoute>} />
        <Route path="/hr/add_visitor_general" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><AddVisitorGeneralPage /></ProtectedRoute>} />
        <Route path="/hr/add_visitor_govt" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><AddVisitorGovtPage /></ProtectedRoute>} />
        <Route path="/hr/add_visitor_hr" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><AddVisitorHRPage /></ProtectedRoute>} />
        <Route path="/hr/add_visitor_service" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><AddVisitorServicePage /></ProtectedRoute>} />
        <Route path="/hr/add_visitor_foreign" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><AddVisitorForeignPage /></ProtectedRoute>} />
        <Route path="/hr/hrrep/:id" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><EnterpriseVisitorProfile /></ProtectedRoute>} />
        <Route path="/hr/analytics" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/hr/audit" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><AuditPage /></ProtectedRoute>} />
        {/* <Route path="/hr/approvals" element={<ProtectedRoute requiredRole="hr" userRole={userRole} isLoading={isLoading}><RegistrationManagement /></ProtectedRoute>} /> */}


        {/*SECURITY PORTAL ROUTES*/}
        <Route path="/security" element={<ProtectedRoute requiredRole="security" userRole={userRole} isLoading={isLoading}><SecurityDashboard /></ProtectedRoute>} />
        <Route path="/security/verify/:visitorId" element={<ProtectedRoute requiredRole="security" userRole={userRole} isLoading={isLoading}><VisitorVerification /></ProtectedRoute>} />


        {/*CATCH-ALL (404)*/}
        <Route path="*" element={
          <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
              <p>Portal gateway not found.</p>
              <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">Return to Login</a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}