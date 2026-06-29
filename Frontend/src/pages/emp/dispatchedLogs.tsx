// pages/emp/dispatchedlogs.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, User, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import SearchFilterMatrix from '../../components/common/SearchFilterMatrix';
import VisitorTable  from '../../components/common/eVisitorTable';
import type { VisitorRecord } from '../../components/common/eVisitorTable';
import { supabase } from '../../lib/supabase';

export default function DispatchedLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    pipeline: [],
    status: [],
    department: []
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

const [currentUser, setCurrentUser] = useState({ empId: '', name: '', dept: '' });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: emp } = await supabase.from('employees').select('*').eq('email', user.email).single();
        if (emp) {
          setCurrentUser({ 
            empId: emp.id, 
            name: emp.name, 
            dept: emp.department || 'General Unit' 
          });
        }
      }
    };
    fetchUser();
  }, []);

useEffect(() => {
  if(!currentUser.empId) return;
    async function fetchDispatchedLogs() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('visits')
          .select(`
            visit_id,
            visit_type,
            department,
            purpose,
            status,
            hr_remarks,
            start_date,
            created_at,
            visitors (visitor_id, gender, name, document_url, phone, address, email, dob, organization, designation, id_type, id_number, nationality),
            escorts (name, phone, id_number, id_type, email, gender)
          `)
          .eq('host_employee_id', currentUser.empId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const transformed: any[] = data.map((row: any) => {
            let uiPipeline = 'Walk-in';
            if (row.visit_type === 'scheduled') uiPipeline = 'Pre-Scheduled';
            if (row.visit_type === 'repeated') uiPipeline = 'Repeated';

            const escortsArray = Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []);
            
            return {
              id: row.visit_id,
              visitorId: row.visitors?.visitor_id, 
              visitorName: row.visitors?.name || 'Unknown',
              gender: row.visitors?.gender || 'N/A', 
              phone: row.visitors?.phone || 'N/A',
              email: row.visitors?.email || 'N/A',
              dob: row.visitors?.dob || 'N/A',
              id_type: row.visitors?.id_type || 'Govt ID',
              id_number: row.visitors?.id_number || 'N/A',
              address: row.visitors?.address || 'N/A',
              pipeline: uiPipeline,
              department: row.department || "General Unit",
              purpose: row.purpose || 'General Entry',
              documentUrl: row.visitors?.document_url || null,
              hostName: currentUser.name,
              hostDept: currentUser.dept,
              escorts: escortsArray,
              requestDate: new Date(row.start_date || row.created_at).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              status: row.status === 'Approved' ? 'Cleared' : row.status,
              organization: row.visitors?.organization || 'N/A',
              hr_remarks: row.hr_remarks || ''
            };
          });
          setLogs(transformed);
        }
      } catch (err) {
        console.error("Error fetching dispatched logs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDispatchedLogs();
  }, []);

  const filterBuckets = [
    {
      key: 'pipeline',
      title: 'Visit Type',
      options: [
        { label: 'Walk-in', value: 'Walk-in' },
        { label: 'Pre-Scheduled', value: 'Pre-Scheduled' },
        { label: 'Repeated', value: 'Repeated' },
      ]
    },
    {
      key: 'status',
      title: 'Status',
      options: [
        { label: 'Cleared', value: 'Cleared' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Expired', value: 'Expired' },
      ]
    },
    {
      key: 'department',
      title: 'Department',
      options: [
        { label: 'Research Wing', value: 'Research Wing' },
        { label: 'IT Department', value: 'IT Department' },
        { label: 'Cyber Security Unit', value: 'Cyber Security Unit' },
        { label: 'Logistics Division', value: 'Logistics Division' },
        { label: 'Human Resources', value: 'Human Resources' },
        { label: 'General Unit', value: 'General Unit' },
      ]
    }
  ];

  const handleFilterToggle = (bucketKey: string, value: string) => {
    setSelectedFilters(prev => {
      const currentSelection = prev[bucketKey] || [];
      const updatedSelection = currentSelection.includes(value)
        ? currentSelection.filter(item => item !== value)
        : [...currentSelection, value];
      return { ...prev, [bucketKey]: updatedSelection };
    });
  };

  const handleRevoke = async (visitId: string) => {
    if(!window.confirm("Are you sure you want to revoke this pass request?")) return;
    try {
      const { error } = await supabase.from('visits').update({ status: 'Revoked' }).eq('visit_id', visitId);
      if (error) throw error;
      setLogs(prev => prev.map(x => x.id === visitId ? { ...x, status: 'Revoked' } : x));
    } catch (err) {
      console.error("Failed to revoke pass:", err);
      alert("Failed to revoke pass request.");
    }
  };

  const handleEdit = (visitor: VisitorRecord) => {
    navigate('/emp/add_visitor', { state: { autofill: visitor, isEdit: true } });
  }

  const handleView = (visitor: VisitorRecord) => {
    setSelectedVisitor(visitor);
    setIsDrawerOpen(true);
  };

  const visibleRows = React.useMemo(() => {
    return logs.filter(item => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        if (!item.visitorName.toLowerCase().includes(query) && !item.id.toLowerCase().includes(query)) return false;
      }
      for (const key of Object.keys(selectedFilters)) {
        const vals = selectedFilters[key];
        if (vals.length > 0) {
          const itemValue = item[key as keyof VisitorRecord];
          if (typeof itemValue === 'string' && !vals.includes(itemValue)) return false;
        }
      }
      return true;
    });
  }, [logs, searchTerm, selectedFilters]);

  return (
    <DashboardLayout role="emp" userName={currentUser.name}>
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-6">
          <Link to="/emp" className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors w-fit mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Terminal Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Your Dispatched Pass Logs</h1>
          <p className="text-sm text-slate-500">Historical archive ledger for credentials generated at this portal station</p>
        </div>

        <div className="bg-white border border-slate-400/80 rounded-xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-400/60 bg-white flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base">Archived Historical Entries</h3>
            <SearchFilterMatrix searchTerm={searchTerm} onSearchChange={setSearchTerm} selectedFilters={selectedFilters} onFilterToggle={handleFilterToggle} filterBuckets={filterBuckets} placeholder="Search name or pass ID..." />
          </div>

          <VisitorTable 
            data={visibleRows} 
            loading={loading}
            onEdit={handleEdit}
            onRevoke={handleRevoke}
            onReRegister={(visitor: any) => {
              // FIX: Construct a clean autofill object so it links to the existing profile ID
              const cleanAutofill = {
                ...visitor,
                visitorId: visitor.visitorId, // Links to the database profile
                id: undefined, // Removes the old visit ID so it doesn't trigger 'Edit' mode
                purpose: '', // Blank out old purpose
                department: '', // Blank out old department
                escorts: [], // Clear escorts
                pipeline: 'Repeated' 
              };
              navigate('/emp/add_visitor', { state: { autofill: cleanAutofill } });
            }}
            onView={handleView}
          />

        </div>

        {/* EMP READ-ONLY SLIDE-OUT DRAWER */}
        {isDrawerOpen && selectedVisitor && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
            
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Clearance Status</h2>
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedVisitor.id}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" /> Visitor Identity
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Full Name</span><span className="col-span-2 font-bold text-slate-900">{selectedVisitor.visitorName}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Phone</span><span className="col-span-2 font-medium text-slate-900 font-mono">{selectedVisitor.phone}</span></div>
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Email</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.email}</span></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <Building className="w-4 h-4 mr-2 text-blue-600" /> Purpose of Visit
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2"><span className="text-slate-500">Pipeline</span><span className="col-span-2 font-medium text-slate-900">{selectedVisitor.pipeline}</span></div>
                    <div>
                      <span className="text-slate-500 block mb-1 mt-2">Declared Purpose</span>
                      <div className="bg-white p-3 border border-slate-200 rounded-lg leading-relaxed shadow-sm text-slate-800 text-xs font-medium">
                        {selectedVisitor.purpose}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  HR Review Commentary
                </label>
                <div className="w-full p-4 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 whitespace-pre-wrap min-h-[80px]">
                  {selectedVisitor.hr_remarks ? (
                    <span className="italic">"{selectedVisitor.hr_remarks}"</span>
                  ) : (
                    <span className="text-slate-400 italic">No notes left by HR for this request.</span>
                  )}
                </div>
                {selectedVisitor.status === 'Denied' && (
                  <button onClick={() => { setIsDrawerOpen(false); handleEdit(selectedVisitor); }} className="mt-4 w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-colors">
                    Correct & Resend Request
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </DashboardLayout>
  );
}