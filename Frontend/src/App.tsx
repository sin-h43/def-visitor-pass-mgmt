import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- Employee Pages ---
import EmployeeDashboard from './pages/emp/index';
import AddVisitorPage from './pages/emp/add_visitor';
import RepeatedVisitorPage from './pages/emp/repeated_visitor';
import DispatchedLogsPage from './pages/emp/dispatchedLogs';

// --- HR Pages (Placeholders for what we build next) ---
import HRDashboard from './pages/hr/index';
import VisitorMgmtPage from './pages/hr/visitormgmt';
import HRAddVisitorPage from './pages/hr/add_visitor_general';
import AnalyticsPage from './pages/hr/analytics';
import AuditPage from './pages/hr/audit';
import HRRepeatedVisitorLogPage from './pages/hr/hr_repeated_visitor.';
import VisitorProfilePage from './pages/hr/visitor_profile';
import AddVisitorGeneralPage from './pages/hr/add_visitor_general';
import AddVisitorForeignPage from './pages/hr/add_visitor_foriegn';
import AddVisitorGovtPage from './pages/hr/add_visitor_govt';
import AddVisitorHRPage from './pages/hr/add_visitor_hr';
import AddVisitorServicePage from './pages/hr/add_visitor_service';

export default function App() {
  return (
    <>
    
    <Router>
      <Routes>
        {/* Default Route - Redirects to Employee Portal for now */}
        <Route path="/" element={<Navigate to="/emp" replace />} />

        {/* =========================================
            EMPLOYEE PORTAL ROUTES
        ========================================= */}
        <Route path="/emp" element={<EmployeeDashboard />} />
        <Route path="/emp/add_visitor" element={<AddVisitorPage />} />
        <Route path="/emp/repeated_visitor" element={<RepeatedVisitorPage />} />
        <Route path="/emp/dispatchedlogs" element={<DispatchedLogsPage />} />


        
        {/* Catch-all for Employee settings/misc */}
        <Route path="/emp/settings" element={<div className="p-8">Employee Settings (Coming Soon)</div>} />

       {/* =========================================
    HR PORTAL ROUTES
========================================= */}
<Route path="/hr" element={<HRDashboard />} />
<Route path="/hr/visitormgmt" element={<VisitorMgmtPage />} />

{/* Fallback support for both case pathways to prevent portal dropouts */}
<Route path="/hr/add_visitor" element={<HRAddVisitorPage />} />
<Route path="/hr/addvisitor" element={<HRAddVisitorPage />} />
<Route path="/hr/hrrep" element={<HRRepeatedVisitorLogPage />} />
<Route path="/hr/add_visitor_general" element ={ <AddVisitorGeneralPage /> } />
<Route path="/hr/add_visitor_govt" element ={ <AddVisitorGovtPage /> } />
<Route path="/hr/add_visitor_hr" element ={ <AddVisitorHRPage /> } />
<Route path="/hr/add_visitor_service" element ={ <AddVisitorServicePage /> } />
<Route path="/hr/add_visitor_foriegn" element ={ <AddVisitorForeignPage /> } />
<Route path="/hr/visitor/:id" element={<VisitorProfilePage />} />

<Route path="/hr/analytics" element={<AnalyticsPage />} />
<Route path="/hr/audit" element={<AuditPage />} />
        {/* Catch-all for 404 Pages */}
        <Route path="*" element={
          <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
              <p>Portal gateway not found.</p>
              <a href="/emp" className="text-blue-600 hover:underline mt-4 inline-block">Return to Base Console</a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
    </>
  );
}