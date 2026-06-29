// components/layout/DashboardLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Bell, LayoutDashboard, UserPlus, FileText, Settings, Shield, BarChart3, Users, PanelLeftClose, PanelLeftOpen, Repeat } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  role: 'emp' | 'hr' | 'security';
  userName: string;
}

export default function DashboardLayout({ children, role, userName }: LayoutProps) {
  const location = useLocation();
  
  // Managed state for expanding/collapsing navigation bar text
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);

  // Dynamic menu routing based on user role
  let menuItems: { label: string; icon: any; path: string }[] = [];
  
  if (role === 'emp') {
    menuItems = [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/emp' },
      { label: 'Add Visitor', icon: UserPlus, path: '/emp/add_visitor' },
      { label: 'Repeated Visitor', icon: Users, path: '/emp/repeated_visitor' },
      { label: 'Settings', icon: Settings, path: '/emp/settings' },
    ];
  } else if (role === 'hr') {
    menuItems = [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/hr' },
      { label: 'Visitor Management', icon: Users, path: '/hr/visitormgmt' },
      { label: 'Repeated Visitor Logs', icon: Repeat, path: '/hr/hrrep' },
      { label: 'Analytics', icon: BarChart3, path: '/hr/analytics' },
      { label: 'Audit Logs', icon: FileText, path: '/hr/audit' },
    ];
  } else if (role === 'security') {
    menuItems = [
      { label: 'Security Terminal', icon: LayoutDashboard, path: '/security' },
      { label: 'Settings', icon: Settings, path: '/security/settings' },
    ];
  }

  // Dynamic role title for the top right profile block
  const roleLabel = role === 'hr' ? 'HR Officer' : role === 'security' ? 'Security Operations' : 'Core Entry Console';

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden relative">
      
      {/* --- ICON-ANCHORED SLIDABLE LEFT SIDEBAR --- */}
      <aside 
        className={`bg-gray-900 text-slate-300 flex flex-col border-r border-gray-800 shrink-0 transition-all duration-300 ease-in-out z-30 ${
          isLeftSidebarOpen ? 'w-52' : 'w-20'
        }`}
      >
        {/* Brand Header: Static padding guarantees the shield icon never jumps or moves */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800 text-white font-bold text-lg shrink-0">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-amber-500 mr-3 shrink-0" />
            <span className={`transition-all duration-200 ${
              isLeftSidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0 overflow-hidden'
            }`}>
              DEFENCE PASS
            </span>
          </div>
        </div>
        
        {/* Navigation Stream: Rigid structural padding protects icon positions */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label} 
                to={item.path} 
                title={!isLeftSidebarOpen ? item.label : undefined}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group whitespace-nowrap justify-start ${
                  isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 mr-3 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`} />
                
                <span className={`text-sm font-medium transition-all duration-200 ${
                  isLeftSidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0 overflow-hidden'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header Frame */}
        <header className="h-16 bg-slate-50 border-b border-slate-400/60 flex items-center justify-between px-8 shrink-0">
          
          {/* Left Side Header Controls: Sidebar Collapse Trigger */}
          <div className="flex items-center">
            <button 
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              className="p-1.5 hover:bg-slate-200 border border-slate-400/60 rounded-lg transition-colors text-slate-700 bg-white"
              title={isLeftSidebarOpen ? "Collapse Navigation Sidebar" : "Expand Navigation Sidebar"}
            >
              {isLeftSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {/* Right Header Controls Strip */}
          <div className="flex items-center space-x-6 text-slate-600">
            
            {/* Calendar Component Context */}
            <div className="flex items-center text-sm font-medium">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>

            {/* Notification Bell */}
            <Bell className="w-5 h-5 cursor-pointer hover:text-slate-800" />
            
            {/* Profile Avatar Context Box */}
            <div className="flex items-center pl-4 border-l border-slate-400/60">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mr-3">
                {userName.charAt(0)}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-slate-800 leading-none">{userName}</p>
                <p className="text-xs text-slate-500 mt-1">{roleLabel}</p>
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Page Workspace Render Shell */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {children}
        </main>
      </div>

    </div>
  );
}