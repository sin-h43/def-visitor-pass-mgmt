// pages/hr/analytics.tsx
import { useState } from 'react';
import { ShieldCheck, FileText ,Users, Clock, XCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

interface CategoryMetric {
  category: string;
  count: number;
  percentage: number;
  color: string;
  bg: string;
}

// 1. Timeframe data dictionary mapped outside the component body to maintain clean scope tracking
const analyticsDataByTimeframe: Record<string, { hour: string; count: number }[]> = {
  '24h': [
    { hour: '12 AM', count: 5 },
    { hour: '4 AM', count: 2 },
    { hour: '8 AM', count: 35 },
    { hour: '12 PM', count: 78 },
    { hour: '4 PM', count: 95 },
    { hour: '8 PM', count: 40 },
    { hour: '12 AM', count: 8 }
  ],
  '7d': [
    { hour: '12 AM', count: 12 },
    { hour: '4 AM', count: 8 },
    { hour: '8 AM', count: 48 },
    { hour: '12 PM', count: 62 },
    { hour: '4 PM', count: 85 },
    { hour: '8 PM', count: 50 },
    { hour: '12 AM', count: 15 }
  ],
  '30d': [
    { hour: '12 AM', count: 20 },
    { hour: '4 AM', count: 15 },
    { hour: '8 AM', count: 55 },
    { hour: '12 PM', count: 70 },
    { hour: '4 PM', count: 90 },
    { hour: '8 PM', count: 58 },
    { hour: '12 AM', count: 22 }
  ]
};

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<string>('7d');
  
  // State for tracking active hover point data matrix properties
  const [hoveredPoint, setHoveredPoint] = useState<{ idx: number; x: number; y: number; hour: string; count: number } | null>(null);

  // High-density data metrics reflecting your visual design requirements
  const visitorCategories: CategoryMetric[] = [
    { category: 'Contractors', count: 248, percentage: 38, color: 'bg-blue-600', bg: 'bg-blue-50' },
    { category: 'Vendors', count: 157, percentage: 24, color: 'bg-sky-500', bg: 'bg-sky-50' },
    { category: 'Government', count: 105, percentage: 16, color: 'bg-amber-500', bg: 'bg-amber-50' },
    { category: 'Foreign Nationals', count: 78, percentage: 12, color: 'bg-purple-600', bg: 'bg-purple-50' },
    { category: 'HR Related', count: 66, percentage: 10, color: 'bg-indigo-500', bg: 'bg-indigo-50' }
  ];

  const departmentCrowd = [
    { name: 'Research Wing', count: 124, max: 140 },
    { name: 'IT Department', count: 98, max: 140 },
    { name: 'Operations', count: 76, max: 140 },
    { name: 'Admin', count: 54, max: 140 },
    { name: 'Logistics', count: 42, max: 140 },
    { name: 'HR Department', count: 35, max: 140 }
  ];

  // Dynamic assignment layer parsing states
  const lineChartData = analyticsDataByTimeframe[timeframe] || analyticsDataByTimeframe['7d'];

  // SVG Dimension Constants
  const svgWidth = 500;
  const svgHeight = 180;
  const maxVal = 100;

  // Compute coordinate metrics dynamically relative to timeframe data lengths
  const points = lineChartData.map((item, idx) => {
    const x = (idx / (lineChartData.length - 1)) * (svgWidth - 40) + 20;
    const y = svgHeight - (item.count / maxVal) * (svgHeight - 40) - 20;
    return { x, y, ...item };
  });

  // Structural path vector string builder
  const buildSplinePath = (): string => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i, a) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const cpX1 = a[i - 1].x + (p.x - a[i - 1].x) / 2;
      const cpY1 = a[i - 1].y;
      const cpX2 = a[i - 1].x + (p.x - a[i - 1].x) / 2;
      const cpY2 = p.y;
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, '');
  };

  return (
    <DashboardLayout role="hr" userName="Sinchana K">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Block Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Analytics Dashboard</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Insights and analytics for visitor management</p>
          </div>

          {/* Timeframe selector controls mapping click states directly */}
          <div className="flex items-center space-x-1 bg-slate-100 border border-slate-300 rounded-lg p-1 shadow-sm font-semibold text-xs">
            {[
              { label: 'Today', value: '24h' },
              { label: '7 Days', value: '7d' },
              { label: '30 Days', value: '30d' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimeframe(opt.value)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  timeframe === opt.value 
                    ? 'bg-white text-slate-800 border border-slate-200 shadow-sm font-bold' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Visitors', value: '654', diff: '+8.4%', direction: 'up', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { title: 'Approval Rate', value: '92.6%', diff: '+5.2%', direction: 'up', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { title: 'Denial Rate', value: '7.4%', diff: '-2.1%', direction: 'down', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
            { title: 'Avg. Processing Time', value: '18m 42s', diff: '-4.3%', direction: 'down', icon: Clock, color: 'text-sky-600', bg: 'bg-sky-50' }
          ].map((card, idx) => (
            <div key={idx} className="bg-white border border-slate-300 p-5 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-400 block tracking-wide">{card.title}</span>
                <div className="flex items-baseline space-x-2 mt-1.5">
                  <span className="text-2xl font-black text-slate-800 tracking-tight">{card.value}</span>
                  <span className={`text-xs font-bold ${card.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {card.diff}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${card.bg} ${card.color} border border-slate-100`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Core Layout Graphs Splitting Rows */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* Left Block: Vector Spline Chart Window (60%) */}
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[360px]">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Peak Hours <span className="text-xs font-medium text-slate-400 font-mono">(This Week)</span></h3>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Visitors</span>
            </div>

            <div className="relative w-full h-56 mt-4 flex items-end">
              {/* Y-Axis Line grid markers */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] font-bold text-slate-400 font-mono">
                {[100, 80, 60, 40, 20, 0].map((val) => (
                  <div key={val} className="w-full flex items-center border-b border-slate-100 pb-0.5">
                    <span className="w-6 text-left">{val}</span>
                    <div className="flex-1 border-b border-slate-100" />
                  </div>
                ))}
              </div>

              {/* Responsive SVG Layout Engine */}
              <svg className="w-full h-full overflow-visible z-10" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gradient area fill beneath the curve path */}
                <path 
                  d={`${buildSplinePath()} L ${points[points.length - 1].x} ${svgHeight - 20} L ${points[0].x} ${svgHeight - 20} Z`} 
                  fill="url(#lineGrad)" 
                />

                {/* Spline Path stroke vector layer */}
                <path 
                  d={buildSplinePath()} 
                  fill="none" 
                  stroke="#2563eb" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                />

                {/* Node Circles and Interaction zones mapper */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={hoveredPoint?.idx === idx ? "5" : "3.5"} 
                      fill={hoveredPoint?.idx === idx ? "#2563eb" : "#ffffff"} 
                      stroke="#2563eb" 
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r="16" 
                      fill="transparent" 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({ idx, x: p.x, y: p.y, hour: p.hour, count: p.count })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                ))}
              </svg>

              {/* Dynamic Floating Tooltip Modal Layer */}
              {hoveredPoint && (
                <div 
                  style={{ 
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`, 
                    top: `${(hoveredPoint.y / svgHeight) * 100 - 15}%` 
                  }}
                  className="absolute pointer-events-none bg-slate-800 text-white p-2 rounded border border-slate-700 shadow-xl font-mono text-[10px] transform -translate-x-1/2 -translate-y-full z-40 whitespace-nowrap animate-fade-in"
                >
                  <p className="font-bold text-slate-300">{hoveredPoint.hour}</p>
                  <p className="font-black text-white text-xs mt-0.5">{hoveredPoint.count} Visitors</p>
                </div>
              )}
            </div>

            {/* X-Axis Timeline Text labels summary */}
            <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono px-3 pt-2 border-t border-slate-100">
              {lineChartData.map((item, idx) => (
                <span key={idx}>{item.hour}</span>
              ))}
            </div>
          </div>

          {/* Right Block: Horizontal Department Crowd Bars (40%) */}
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[360px]">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Department Crowd</h3>
            </div>

            <div className="flex-1 flex flex-col justify-between py-2">
              {departmentCrowd.map((dept, idx) => {
                const widthPercent = (dept.count / dept.max) * 100;
                return (
                  <div key={idx} className="flex items-center text-xs font-semibold">
                    <span className="w-28 text-slate-600 truncate">{dept.name}</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 mx-3">
                      <div 
                        className="h-full rounded-full bg-purple-600"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-slate-500 font-mono font-bold">{dept.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Lower Matrix: Category Donut & Reports Generator */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* Lower Left Block: Category Distribution Ring List */}
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[260px]">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Visitor Category Breakdown</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
              <div className="relative flex items-center justify-center h-40">
                <div className="w-32 h-32 rounded-full border-[14px] border-blue-600 flex items-center justify-center relative">
                  <div className="absolute inset-[-14px] rounded-full border-[14px] border-sky-500 border-t-transparent border-r-transparent transform rotate-45" />
                  <div className="absolute inset-[-14px] rounded-full border-[14px] border-amber-500 border-t-transparent border-r-transparent border-b-transparent transform -rotate-45" />
                  <div className="text-center">
                    <span className="text-2xl font-black text-slate-800 block">654</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                {visitorCategories.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-slate-600 font-medium">{item.category}</span>
                    </div>
                    <span className="font-mono text-slate-400">{item.percentage}% <span className="text-[10px] text-slate-300">({item.count})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lower Right Block: Compliance Document Generators */}
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[260px]">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Compliance Reports</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">One-click generation of daily, weekly, monthly reports</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {['Daily Report', 'Weekly Report', 'Monthly Report', 'Custom Report'].map((title, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-between text-center shadow-xs group hover:bg-white hover:border-blue-500 transition-all cursor-pointer">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-blue-600 group-hover:bg-blue-50 transition-colors shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 mt-3 block">{title}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); alert(`Compiling binary export payload for ${title}...`); }}
                    className="mt-4 w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-extrabold rounded-lg shadow-xs tracking-wide uppercase transition-colors"
                  >
                    Generate
                  </button>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-medium text-slate-400 text-center mt-4">
              All reports include approvals, denials, visitor categories, blacklisted attempts and more.
            </p>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}