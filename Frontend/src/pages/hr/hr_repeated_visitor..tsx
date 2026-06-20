// pages/hr/repeated_visitors.tsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, History, RefreshCw, X, Shield, Calendar, UserCheck, Search, Building, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import type { TableColumn } from '../../types/visitor';
import { supabase } from '../../lib/supabase';

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
  id: string; // visitor_id
  name: string;
  phone: string;
  email: string;
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
  const [directory, setDirectory] = useState<VisitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Visitors');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<VisitorProfile | null>(null);

  // --- SUPABASE FETCH & DATA GROUPING ---
  const fetchVisitorDirectory = async () => {
    try {
      setLoading(true);
      // Fetch all visits and their associated visitor records
      const { data, error } = await supabase
        .from('visits')
        .select(`
          visit_id, start_date, purpose, status, department,
          visitors (visitor_id, name, phone, email, nationality, organization, designation, dob, document_url, address, id_type, id_number),
          host:employees!visits_host_employee_id_fkey (name)
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Group visits by visitor_id
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
            
            // Update last visit date if this record is newer
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

        // Convert map to array and sort by most recent visit
        const sortedDirectory = Array.from(profileMap.values()).sort((a, b) => b.rawLastVisit - a.rawLastVisit);
        setDirectory(sortedDirectory);
      }
    } catch (error) {
      console.error('Error fetching visitor directory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitorDirectory();
  }, []);

  // --- RE-REGISTER LOGIC (STRIPPING OLD DATA) ---
  const handleReRegister = (profile: VisitorProfile) => {
    setIsDrawerOpen(false);

    // Smartly guess the category based on their nationality/org
    let category = 'general';
    if (profile.nationality && profile.nationality.toLowerCase() !== 'indian') category = 'foreign';
    else if (profile.organization && (profile.organization.toLowerCase().includes('govt') || profile.organization.toLowerCase().includes('defence'))) category = 'govt';

    const cleanAutofill = {
      id: profile.id, 
      visitorName: profile.name,
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
      
      // EXPLICITLY STRIPPED FIELDS FOR NEW VISIT:
      purpose: '',
      department: '',
      escorts: []
    };

    navigate(`/hr/add_visitor?category=${category}`, { state: { autofill: cleanAutofill } });
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
            // --- NEW: Navigates to the massive profile page we just built! ---
            onClick={() => navigate(`/hr/visitor/${row.id}`, { state: { profile: row } })} 
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
      <DashboardLayout role="hr" userName="Sinchana K">
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
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Professional Identity Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Master Visitor Directory</h1>
            <p className="text-sm text-slate-500">Searchable ledger of all identities that have accessed the facility.</p>
          </div>
        </div>

        {/* Directory Snapshot Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Total Registered Identities', value: directory.length.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
            { title: 'Frequent Visitors (2+)', value: directory.filter(d => d.totalVisits > 1).length.toString(), icon: History, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { title: 'Total Processed Entries', value: directory.reduce((acc, curr) => acc + curr.totalVisits, 0).toString(), icon: UserCheck, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' }
          ].map((stat, idx) => (
            <div key={idx} className={`bg-white border p-4 rounded-xl flex items-center justify-between shadow-sm ${stat.border}`}>
              <div>
                <span className="text-xs font-bold text-slate-500 block tracking-wide uppercase">{stat.title}</span>
                <span className="text-2xl font-black text-slate-800 block mt-1">{stat.value}</span>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
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

        {/* VISITOR HISTORY SLIDE-OUT DRAWER */}
        {isDrawerOpen && selectedProfile && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
            
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Identity Ledger</h2>
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedProfile.id}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                
                {/* 1. Master Identity Profile */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-indigo-600" /> Authenticated Profile
                  </h3>
                  <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-4 mb-5 border-b border-slate-100 pb-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">
                        {selectedProfile.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{selectedProfile.name}</h3>
                        <p className="text-xs font-semibold text-slate-500">{selectedProfile.organization}</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-3 gap-2"><span className="text-slate-400 font-medium">Phone</span><span className="col-span-2 font-semibold text-slate-800 font-mono">{selectedProfile.phone}</span></div>
                      <div className="grid grid-cols-3 gap-2"><span className="text-slate-400 font-medium">Email</span><span className="col-span-2 font-semibold text-slate-800 break-all">{selectedProfile.email}</span></div>
                      <div className="grid grid-cols-3 gap-2"><span className="text-slate-400 font-medium">Nationality</span><span className="col-span-2 font-semibold text-slate-800">{selectedProfile.nationality}</span></div>
                      <div className="grid grid-cols-3 gap-2"><span className="text-slate-400 font-medium">{selectedProfile.idType}</span><span className="col-span-2 font-semibold text-slate-800 font-mono">{selectedProfile.idNumber}</span></div>
                    </div>
                  </div>
                </section>

                {/* 2. Historical Visits Log */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center justify-between">
                    <span className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-indigo-600" /> Timeline of Visits</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">{selectedProfile.totalVisits} Recorded</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Reverse array to show newest first */}
                    {[...selectedProfile.history].reverse().map((visit, idx) => (
                      <div key={idx} className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm relative overflow-hidden group">
                        
                        {/* Status color strip on the left */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          visit.status === 'Approved' || visit.status === 'Cleared' ? 'bg-emerald-400' :
                          visit.status === 'Pending' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />

                        <div className="flex justify-between items-start mb-2 pl-2">
                          <span className="text-xs font-bold text-slate-800">{visit.date}</span>
                          <span className="text-[10px] font-mono text-slate-400">{visit.visitId}</span>
                        </div>
                        
                        <div className="pl-2 space-y-1">
                          <div className="flex items-center text-xs">
                            <Building className="w-3 h-3 mr-1.5 text-slate-400" />
                            <span className="text-slate-600 font-medium">{visit.department}</span>
                          </div>
                          <div className="flex items-center text-xs">
                            <UserCheck className="w-3 h-3 mr-1.5 text-slate-400" />
                            <span className="text-slate-600">Hosted by <span className="font-semibold text-slate-800">{visit.hostName}</span></span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 pl-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stated Purpose</span>
                          <p className="text-xs text-slate-700 font-medium italic">"{visit.purpose}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>

              {/* ACTION FOOTER */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <span className="text-xs font-medium text-slate-500">
                  Last active: {selectedProfile.lastVisitDate}
                </span>

                <button 
                  onClick={() => handleReRegister(selectedProfile)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition-colors shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]"
                >
                  <RefreshCw className="w-4 h-4" /> Re-Register Visitor
                </button>
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