// pages/emp/dispatchedlogs.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
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

  const currentUser = {
    empId: 'EMP001',
    name: 'Sinchana K',
    dept: 'Cyber Security Unit'
  };

  useEffect(() => {
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
            start_date,
            created_at,
             
            visitors (visitor_id, name,document_url, phone, address, email, dob, organization, designation, id_type, id_number, nationality),
            escorts(name,phone,id_number, id_type)
          `)
          .eq('host_employee_id', currentUser.empId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const transformed: VisitorRecord[] = data.map((row: any) => {
            let uiPipeline = 'Walk-in';
            if (row.visit_type === 'PRESCHEDULED') uiPipeline = 'Pre-Scheduled';
            if (row.visit_type === 'REPEATED') uiPipeline = 'Repeated';

            const escortsArray = Array.isArray(row.escorts) ? row.escorts : (row.escorts ? [row.escorts] : []);
            
            return {
              id: row.visit_id,
              visitorName: row.visitors?.name || 'Unknown',
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
              organization: row.visitors?.organization || 'N/A'
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
            
            <SearchFilterMatrix 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedFilters={selectedFilters}
              onFilterToggle={handleFilterToggle}
              filterBuckets={filterBuckets}
              placeholder="Search name or pass ID..."
            />
          </div>

          <VisitorTable 
            data={visibleRows} 
            loading={loading}
            onEdit={(visitor) => navigate('/emp/add_visitor', { state: { autofill: visitor, isEdit: true } })}
            onRevoke={handleRevoke}
            onReRegister={(visitor) => navigate('/emp/add_visitor', { state: { autofill: visitor } })}
          />

        </div>
      </div>
    </DashboardLayout>
  );
}