import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  CheckCircle2,
  BookOpen,
  DollarSign,
  Library,
  Bell,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  Activity,
  LogOut,
  UserCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  count?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isManagement = role === 'MANAGEMENT' || role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isFaculty = role === 'FACULTY';
  const isStudent = role === 'STUDENT';

  // Structured Navigation Groups (Standard Clean College ERP)
  const managementNav: NavGroup[] = [
    {
      group: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Identity & Profile', path: '/profile', icon: ShieldCheck },
        { name: 'Roles & Responsibilities', path: '/roles-responsibilities', icon: FileSpreadsheet },
      ],
    },
    {
      group: 'ACADEMICS',
      items: [
        { name: 'Departments', path: '/departments', icon: Building2 },
        { name: 'Student Directory', path: '/students', icon: GraduationCap },
        { name: 'Faculty Directory', path: '/faculty', icon: Users },
        { name: 'Curriculum & Courses', path: '/academics', icon: BookOpen },
        { name: 'Timetable Schedules', path: '/timetable', icon: CalendarDays },
      ],
    },
    {
      group: 'ADMINISTRATION & FEES',
      items: [
        { name: 'Attendance Records', path: '/attendance', icon: CheckCircle2 },
        { name: 'Fee Ledgers & Billing', path: '/fees', icon: DollarSign },
        { name: 'Library Hub', path: '/library', icon: Library },
      ],
    },
    {
      group: 'COMMUNICATIONS & REPORTS',
      items: [
        { name: 'Notice Circulars', path: '/notices', icon: Bell },
        { name: 'Analytics & Reports', path: '/reports', icon: FileSpreadsheet },
      ],
    },
  ];

  const facultyNav: NavGroup[] = [
    {
      group: 'WORKSPACE',
      items: [
        { name: 'Faculty Dashboard', path: '/dashboard/faculty', icon: LayoutDashboard },
        { name: 'My Profile & Load', path: '/profile', icon: ShieldCheck },
        { name: 'Roles & Responsibilities', path: '/roles-responsibilities', icon: FileSpreadsheet },
      ],
    },
    {
      group: 'TEACHING & CLASSES',
      items: [
        { name: 'Weekly Schedule', path: '/timetable', icon: CalendarDays },
        { name: 'Mark Attendance', path: '/attendance', icon: CheckCircle2 },
        { name: 'Curriculum & Marks', path: '/academics', icon: BookOpen },
        { name: 'Enrolled Students', path: '/students', icon: GraduationCap },
      ],
    },
    {
      group: 'BULLETINS',
      items: [
        { name: 'Circulars & Notices', path: '/notices', icon: Bell },
      ],
    },
  ];

  const studentNav: NavGroup[] = [
    {
      group: 'STUDENT PORTAL',
      items: [
        { name: 'My Dashboard', path: '/dashboard/student', icon: LayoutDashboard },
        { name: 'Student Profile', path: '/profile', icon: ShieldCheck },
      ],
    },
    {
      group: 'ACADEMICS & PROGRESS',
      items: [
        { name: 'Attendance Records', path: '/attendance', icon: CheckCircle2 },
        { name: 'Curriculum & Grades', path: '/academics', icon: BookOpen },
        { name: 'Weekly Timetable', path: '/timetable', icon: CalendarDays },
      ],
    },
    {
      group: 'FINANCE & LIBRARY',
      items: [
        { name: 'Fee Invoices & Dues', path: '/fees', icon: DollarSign },
        { name: 'Library Books Issued', path: '/library', icon: Library },
        { name: 'Campus Bulletins', path: '/notices', icon: Bell },
      ],
    },
  ];

  const activeNav = isStudent ? studentNav : isFaculty ? facultyNav : managementNav;

  const displayName =
    user?.studentProfile
      ? `${user.studentProfile.firstName} ${user.studentProfile.lastName}`
      : user?.facultyProfile
      ? `Prof. ${user.facultyProfile.firstName} ${user.facultyProfile.lastName}`
      : user?.managementProfile
      ? `${user.managementProfile.firstName} ${user.managementProfile.lastName}`
      : user?.email?.split('@')[0] || 'Administrator';

  return (
    <aside className="w-72 bg-[#0B1528] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800/80 shadow-2xl z-20">
      {/* 1. Brand & Institutional Banner with Official ZES Logo */}
      <div className="p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-[#0B1528]">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <img
              src="/zes-logo.png"
              alt="Zeal Education Society"
              className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-lg shadow-zes-950/50 border border-zes-400/40"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <h1 className="font-extrabold text-white text-sm tracking-tight truncate">
                Zeal College (ZCOER)
              </h1>
            </div>
            <p className="text-[10px] text-zes-300 font-medium tracking-wider uppercase flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-zes-400 animate-pulse" />
              Zeal Education Society
            </p>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Categorized Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto custom-scrollbar">
        {activeNav.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
              <span>{section.group}</span>
            </p>
            {section.items.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-zes-800 to-zes-700 text-white shadow-md shadow-zes-950/50 border border-zes-500/40 translate-x-1'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span className="truncate">{link.name}</span>
                  </div>

                  {link.badge ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        link.badgeColor || 'bg-zes-500/20 text-zes-300 border-zes-500/30'
                      }`}
                    >
                      {link.badge}
                    </span>
                  ) : link.count ? (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                      {link.count}
                    </span>
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 3. Bottom Institutional User Session Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zes-800 to-zes-900 border border-zes-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate leading-tight">
                {displayName}
              </p>
              <span className="inline-block text-[10px] text-zes-400 font-semibold tracking-wider uppercase mt-0.5">
                {role}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-zes-300 hover:bg-zes-500/10 rounded-lg transition-colors ml-2"
            title="Terminate ERP Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
