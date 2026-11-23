import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  TableProperties,
  Code2,
  Terminal,
  BookOpen,
  Users,
  GitGraph,
  TrendingUp,
  BarChart3,
  Calculator,
  PieChart,
  Sparkles,
  SlidersHorizontal,
  History,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Boxes
} from 'lucide-react';

const SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Dataset Management', path: '/datasets', icon: Database },
      { name: 'Data Explorer', path: '/explorer', icon: TableProperties }
    ]
  },
  {
    title: 'R PROGRAMMING',
    items: [
      { name: 'R Programming Studio', path: '/r-studio', icon: Code2 },
      { name: 'R Console & Output', path: '/r-console', icon: Terminal },
      { name: 'R Script Library', path: '/r-scripts', icon: BookOpen }
    ]
  },
  {
    title: 'DATA ANALYTICS',
    items: [
      { name: 'RFM Segmentation', path: '/rfm', icon: Users },
      { name: 'K-Means Clustering', path: '/kmeans', icon: GitGraph },
      { name: 'Sales Forecasting', path: '/forecast', icon: TrendingUp },
      { name: 'Sales Analysis', path: '/sales-analysis', icon: BarChart3 },
      { name: 'Statistical Analysis', path: '/statistics', icon: Calculator },
      { name: 'Data Visualization', path: '/visualizations', icon: PieChart },
      { name: 'Automated Insights', path: '/insights', icon: Sparkles },
      { name: 'Manual Analysis', path: '/manual-analysis', icon: SlidersHorizontal }
    ]
  },
  {
    title: 'MANAGEMENT',
    items: [
      { name: 'Analysis History', path: '/history', icon: History },
      { name: 'Reports & Downloads', path: '/reports', icon: FileSpreadsheet },
      { name: 'Settings', path: '/settings', icon: Settings }
    ]
  }
];

export const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#0F172A] border-r border-slate-800/80 z-40 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white leading-tight">
                RFM Analytics
              </span>
              <span className="text-[11px] font-medium text-sky-400 uppercase tracking-wider">
                R Intelligence Engine
              </span>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed ? (
              <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {section.title}
              </h3>
            ) : (
              <div className="h-2" />
            )}
            {section.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={itemIdx}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/20 text-sky-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`
                  }
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80">
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-900/60 text-[11px] text-slate-400 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {!isCollapsed && <span>R 4.4.2 Connected</span>}
        </div>
      </div>
    </aside>
  );
};
