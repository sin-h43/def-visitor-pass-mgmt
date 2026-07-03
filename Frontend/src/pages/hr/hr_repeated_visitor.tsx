// pages/hr/repeated_visitors.tsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import type { TableColumn } from '../../types/visitor';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../hooks/useNotification';
import NotificationToast from '../../components/common/NotificationToast';
import HRNotificationCenter from './HRNotificationCenter';
import { fetchAndVerifyEmployee } from '../../lib/employeeUtils';


// --- DATA MODELS ---
interface VisitHistory {
  visitId: string;
  date: string;
  rawDate: string;
  purpose: string;
  department: string;
  hostName: string;
  status: string;
}

interface VisitorProfile {
  id: string; 
  name: string;
  phone: string;
  email: string;
  gender: string;
  nationality: string;
  organization: string;
  idType: string;
  idNumber: string;
  dob: string;
  address: string;
  docUrl: string | null;
  totalVisits: number;
  lastVisitDate: string;
  rawLastVisit: number;
  history: VisitHistory[];
}

export default function HRRepeatedVisitorLogPage() {
  const navigate = useNavigate();
  const { notifications, addNotification, removeNotification } = useNotification();
  
  const [directory, setDirectory] = useState<VisitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Visitors');
  // Dynamic User State
  const [currentUser, setCurrentUser] = useState({ userName: 'Loading...', avatarUrl: '' });

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          const emp = await fetchAndVerifyEmployee(user.email);
          setCurrentUser({ userName: emp.name, avatarUrl: emp.avatar_url || '' });
        } catch(e) {
          setCurrentUser({ userName: 'HOD Admin', avatarUrl: '' });
        }
      }
    };
    loadUserProfile();
  }, []);

  // --- SUPABASE FETCH & DATA GROUPING ---
  const fetchVisitorDirectory = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('visits')
        .select(`
          visit_id, start_date, purpose, status, department,
          visitors(visitor_id, name, phone, email, nationality, organization, designation, dob, document_url, address, id_type, id_number),
          host:employees!visits_host_employee_id_fkey(name)
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const profileMap = new Map<string, VisitorProfile>();

        data.forEach((row: any) => {
          if (!row.visitors) return;
          const v = row.visitors;
          
          const visitRecord: VisitHistory = {
            visitId: row.visit_id,
            date: new Date(row.start_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            rawDate: row.start_date,
            purpose: row.purpose || 'General Entry',
            department: row.department || 'General Unit',
            hostName: row.host?.name || 'Unassigned',
            status: row.status
          };

          if (profileMap.has(v.visitor_id)) {
            const profile = profileMap.get(v.visitor_id)!;
            profile.history.push(visitRecord);
            profile.totalVisits += 1;
            
            const rowTime = new Date(row.start_date).getTime();
            if (rowTime > profile.rawLastVisit) {
              profile.lastVisitDate = visitRecord.date;
              profile.rawLastVisit = rowTime;
            }
          } else {
            profileMap.set(v.visitor_id, {
              id: v.visitor_id,
              name: v.name || 'Unknown',
              phone: v.phone || 'N/A',
              email: v.email || 'N/A',
              gender: v.gender || 'Others',
              nationality: v.nationality || 'Indian',
              organization: v.organization || 'N/A',
              idType: v.id_type || 'Govt ID',
              idNumber: v.id_number || 'N/A',
              dob: v.dob || 'N/A',
              address: v.address || 'N/A',
              docUrl: v.document_url || null,
              totalVisits: 1,
              lastVisitDate: visitRecord.date,
              rawLastVisit: new Date(row.start_date).getTime(),
              history: [visitRecord]
            });
          }
        });

        const sortedDirectory = Array.from(profileMap.values()).sort((a, b) => b.rawLastVisit - a.rawLastVisit);
        setDirectory(sortedDirectory);
      }
    } catch (error) {
      console.error('Error fetching visitor directory:', error);
      addNotification('error', 'Failed to load visitor directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitorDirectory();
  }, []);

  // --- RE-REGISTER LOGIC ---
  const handleReRegister = (profile: VisitorProfile) => {
    let category = 'general';
    let targetPath = '/hr/add_visitor_general';

    const natLower = (profile.nationality || '').toLowerCase();
    const orgLower = (profile.organization || '').toLowerCase();

    if (natLower && natLower !== 'indian') {
      category = 'foreign';
      targetPath = '/hr/add_visitor_foreign';
    } else if (orgLower.includes('govt') || orgLower.includes('defence') || orgLower.includes('ministry') || orgLower.includes('armed')) {
      category = 'govt';
      targetPath = '/hr/add_visitor_govt';
    } else if (orgLower.includes('service') || orgLower.includes('vendor')) {
      category = 'service';
      targetPath = '/hr/add_visitor_service';
    }

    const cleanAutofill = {
      id: profile.id,
      visitorName: profile.name,
      gender: profile.gender,
      phone: profile.phone,
      email: profile.email,
      dob: profile.dob,
      id_type: profile.idType,
      id_number: profile.idNumber,
      nationality: profile.nationality,
      organization: profile.organization,
      address: profile.address,
      documentUrl: profile.docUrl,
      category: category,
      pipeline: 'Repeated',
      purpose: '',
      department: '',
      escorts: []
    };

    navigate(targetPath, { state: { autofill: cleanAutofill } });
  };

  const processedFilteredQueue = useMemo(() => {
    return directory.filter(row => {
      const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) || row.phone.includes(searchTerm);
      
      let matchesTab = true;
      if (activeTab === 'Frequent (2+ Visits)') matchesTab = row.totalVisits > 1;

      return matchesSearch && matchesTab;
    });
  }, [directory, searchTerm, activeTab]);

  // --- STANDARD PROFESSIONAL COLUMNS ---
  const columns: TableColumn<VisitorProfile>[] = [
    {
      key: 'name',
      label: 'IDENTITY PROFILE',
      render: (row) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">{row.name}</div>
            <div className="text-xs text-slate-500 font-mono">{row.phone}</div>
          </div>
        </div>
      )
    },
    {
      key: 'organization',
      label: 'AFFILIATION',
      render: (row) => (
        <div>
          <div className="text-slate-700 font-medium text-xs truncate max-w-[150px]" title={row.organization}>{row.organization}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{row.nationality}</div>
        </div>
      )
    },
    {
      key: 'totalVisits',
      label: 'HISTORY VOLUME',
      render: (row) => (
        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
          row.totalVisits > 1 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          {row.totalVisits} {row.totalVisits === 1 ? 'Visit' : 'Visits'}
        </span>
      )
    },
    {
      key: 'lastVisitDate',
      label: 'LATEST ENTRY',
      render: (row) => <span className="text-slate-600 font-medium text-xs">{row.lastVisitDate}</span>
    },
    {
      key: 'actions',
      label: 'REGISTRY ACTIONS',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => handleReRegister(row)}
            className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" /> Re-Register
          </button>
          <button 
            onClick={() => navigate(`/hr/hrrep/${row.id}`, { state: { profile: row } })} 
            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200"
          >
            Full Profile
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <DashboardLayout role="hr" userName={currentUser.userName}  >
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-indigo-600 rounded-full mb-4"></div>
            <p className="text-slate-500 font-medium tracking-wide">Compiling Visitor Master Directory...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="hr" userName={currentUser.userName} headerAction={<HRNotificationCenter />} avatarUrl={currentUser.avatarUrl}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Professional Identity Header */}
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Master Visitor Directory</h1>
            <p className="text-sm text-slate-500">Searchable ledger of all identities that have accessed the facility.</p>
          </div>
        </div>

        {/* Main Dashboard Panel Workspace */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center">
            <Search className="w-5 h-5 text-slate-400 mr-3 ml-2" />
            <input 
              type="text"
              placeholder="Search directory by visitor name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder-slate-400"
            />
          </div>

          <div className="flex border-b border-slate-200 text-xs font-semibold space-x-4">
            {['All Visitors', 'Frequent (2+ Visits)'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 relative ${activeTab === tab ? 'text-indigo-600 font-bold border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <DataTable title="" data={processedFilteredQueue} columns={columns} />
          </div>
        </div>

      </div>
      
      <NotificationToast notifications={notifications} onRemove={removeNotification} />
      
    </DashboardLayout>
  );
}