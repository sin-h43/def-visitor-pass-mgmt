import { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCircle, MailOpen, Check, CheckSquare, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UnifiedAlert {
  id: string;
  type: 'ban' | 'forensic' | 'approval';
  title: string;
  timestamp: string;
  remarks: string;
  visit_id?: string;
  visitor_name?: string;
  isRead?: boolean;
}

export default function SecurityNotificationCenter() {
  const [alerts, setAlerts] = useState<UnifiedAlert[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [readAlerts, setReadAlerts] = useState<string[]>(() => {
    const saved = localStorage.getItem('securityReadAlerts');
    return saved ? JSON.parse(saved) : [];
  });

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    const saved = localStorage.getItem('securityDismissedAlerts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('securityReadAlerts', JSON.stringify(readAlerts));
  }, [readAlerts]);

  useEffect(() => {
    localStorage.setItem('securityDismissedAlerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  const fetchMasterFeed = async () => {
    try {
      const newAlerts: UnifiedAlert[] = [];

      const { data: bans } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'visitor_banned')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (bans) {
        bans.forEach(b => newAlerts.push({
          id: `ban-${b.id}`,
          type: 'ban',
          title: 'HOD Permanent Ban',
          timestamp: b.timestamp,
          remarks: b.remarks || 'Visitor has been blacklisted.'
        }));
      }

      const { data: forensics } = await supabase
        .from('forensic_incidents')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (forensics) {
        forensics.forEach(f => newAlerts.push({
          id: `forensic-${f.id}`,
          type: 'forensic',
          title: f.incident_type === 'emergency_revocation' ? 'HOD Emergency Revoke' : 'Active Breach',
          timestamp: f.created_at,
          remarks: f.incident_type === 'emergency_revocation' ? f.reason : `Time Exceeded (${f.excess_minutes}m): ${f.reason}`,
          visit_id: f.visit_id
        }));
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: approvals } = await supabase
        .from('visits')
        .select('visit_id, created_at, visitors(name)')
        .eq('status', 'Approved')
        .gte('start_date', todayStart.toISOString());

      if (approvals) {
        approvals.forEach(a => newAlerts.push({
          id: `approval-${a.visit_id}`,
          type: 'approval',
          title: 'HOD Clearance Granted',
          timestamp: a.created_at,
          remarks: 'Pass generated. Awaiting visitor arrival at Gate.',
          visit_id: a.visit_id,
          visitor_name: Array.isArray(a.visitors) && a.visitors[0]?.name ? a.visitors[0].name : 'Unknown'
        }));
      }

      setAlerts(newAlerts);
    } catch (err) {
      console.error('Error fetching master security feed:', err);
    }
  };

  useEffect(() => {
    fetchMasterFeed();
    const interval = setInterval(fetchMasterFeed, 30000); 
    return () => clearInterval(interval);
  }, []);

  const toggleReadStatus = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setReadAlerts(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedAlerts(prev => [...prev, id]);
  };

  const markAllAsRead = () => {
    const allIds = alerts.map(a => a.id);
    setReadAlerts(prev => Array.from(new Set([...prev, ...allIds])));
  };

  const processedAlerts = useMemo(() => {
    return alerts
      .filter(a => !dismissedAlerts.includes(a.id))
      .map(a => ({ ...a, isRead: readAlerts.includes(a.id) }))
      .sort((a, b) => {
        if (a.isRead && !b.isRead) return 1;
        if (!a.isRead && b.isRead) return -1;
        const severity = { ban: 1, forensic: 2, approval: 3 };
        if (severity[a.type] !== severity[b.type]) return severity[a.type] - severity[b.type];
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [alerts, readAlerts, dismissedAlerts]);

  const unreadCount = processedAlerts.filter(a => !a.isRead).length;

  return (
    <div className="relative z-50">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white border-2 border-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-0 mt-3 w-[420px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden origin-top-right animate-fade-in text-left flex flex-col max-h-[85vh]">

            <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0 shadow-[0_4px_15px_-10px_rgba(0,0,0,0.05)] z-10">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Security Feed</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} New
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs font-semibold text-slate-500 hover:text-blue-500 flex items-center transition-colors">
                  <CheckSquare className="w-3.5 h-3.5 mr-1" /> Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto custom-scrollbar bg-slate-50/50 flex-1">
              {processedAlerts.length > 0 ? (
                <div className="p-3 space-y-1">
                  {processedAlerts.map(alert => {
                    const isRead = alert.isRead;

                    return (
                      <div
                        key={alert.id}
                        className={`group rounded-xl p-3 transition-all flex items-start gap-3 border ${
                          isRead ? 'bg-transparent border-transparent hover:bg-slate-100' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                        }`}
                      >
                        <div className="pt-1.5 shrink-0">
                          <div className={`w-2 h-2 rounded-full transition-colors ${isRead ? 'bg-slate-300' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-bold text-[11px] uppercase tracking-wider transition-colors ${isRead ? 'text-slate-500' : 'text-slate-800'}`}>
                              {alert.title}
                            </span>
                            <div className="flex gap-2 items-center">
                              <span className={`text-[10px] font-mono shrink-0 transition-colors ${isRead ? 'text-slate-400' : 'text-blue-500'}`}>
                                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button 
                                  onClick={(e) => toggleReadStatus(e, alert.id)} 
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors flex items-center ${isRead ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}
                                >
                                  {isRead ? <MailOpen className="w-3 h-3"/> : <Check className="w-3 h-3"/>}
                                </button>
                                <button 
                                  onClick={(e) => handleDismiss(e, alert.id)} 
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors flex items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-slate-50 border border-slate-200"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-0.5">
                            {alert.visitor_name && (
                              <div className={`font-bold text-xs transition-colors ${isRead ? 'text-slate-500' : 'text-slate-900'}`}>
                                {alert.visitor_name} <span className="text-[10px] font-mono text-slate-400 font-normal ml-1">({alert.visit_id})</span>
                              </div>
                            )}
                            <p className={`text-xs mt-0.5 leading-relaxed transition-colors ${isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                              {alert.remarks}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">You're all caught up</p>
                  <p className="text-xs mt-1">No active breaches or alerts.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}