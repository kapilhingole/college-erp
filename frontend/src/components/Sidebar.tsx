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
  LogOut,
  Trophy,
  FileUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
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

  const managementNav: NavGroup[] = [
    {
      group: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Profile', path: '/profile', icon: ShieldCheck },
        { name: 'Roles & Responsibilities', path: '/roles-responsibilities', icon: FileSpreadsheet },
      ],
    },
    {
      group: 'Academics',
      items: [
        { name: 'Departments', path: '/departments', icon: Building2 },
        { name: 'Students', path: '/students', icon: GraduationCap },
        { name: 'Faculty', path: '/faculty', icon: Users },
        { name: 'Curriculum', path: '/academics', icon: BookOpen },
        { name: 'Timetable', path: '/timetable', icon: CalendarDays },
      ],
    },
    {
      group: 'Administration',
      items: [
        { name: 'Attendance', path: '/attendance', icon: CheckCircle2 },
        { name: 'Fees', path: '/fees', icon: DollarSign },
        { name: 'Library', path: '/library', icon: Library },
        { name: 'Data Sync', path: '/data-sync', icon: FileUp, badge: 'SYNC' },
      ],
    },
    {
      group: 'Reports',
      items: [
        { name: 'Notices', path: '/notices', icon: Bell },
        { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
        { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      ],
    },
  ];

  const facultyNav: NavGroup[] = [
    {
      group: 'Workspace',
      items: [
        { name: 'Dashboard', path: '/dashboard/faculty', icon: LayoutDashboard },
        { name: 'Profile', path: '/profile', icon: ShieldCheck },
        { name: 'Roles & Responsibilities', path: '/roles-responsibilities', icon: FileSpreadsheet },
      ],
    },
    {
      group: 'Teaching',
      items: [
        { name: 'Timetable', path: '/timetable', icon: CalendarDays },
        { name: 'Attendance', path: '/attendance', icon: CheckCircle2 },
        { name: 'Curriculum', path: '/academics', icon: BookOpen },
        { name: 'Students', path: '/students', icon: GraduationCap },
      ],
    },
    {
      group: 'General',
      items: [
        { name: 'Notices', path: '/notices', icon: Bell },
        { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      ],
    },
  ];

  const studentNav: NavGroup[] = [
    {
      group: 'Portal',
      items: [
        { name: 'Dashboard', path: '/dashboard/student', icon: LayoutDashboard },
        { name: 'Profile', path: '/profile', icon: ShieldCheck },
      ],
    },
    {
      group: 'Academics',
      items: [
        { name: 'Attendance', path: '/attendance', icon: CheckCircle2 },
        { name: 'Curriculum', path: '/academics', icon: BookOpen },
        { name: 'Timetable', path: '/timetable', icon: CalendarDays },
      ],
    },
    {
      group: 'Other',
      items: [
        { name: 'Fees', path: '/fees', icon: DollarSign },
        { name: 'Library', path: '/library', icon: Library },
        { name: 'Notices', path: '/notices', icon: Bell },
        { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      ],
    },
  ];

  const activeNav = isStudent ? studentNav : isFaculty ? facultyNav : managementNav;

  const displayName =
    user?.studentProfile
      ? `${user.studentProfile.firstName} ${user.studentProfile.lastName}`
      : user?.facultyProfile
      ? `${user.facultyProfile.firstName} ${user.facultyProfile.lastName}`
      : user?.managementProfile
      ? `${user.managementProfile.firstName} ${user.managementProfile.lastName}`
      : user?.email?.split('@')[0] || 'User';

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <img
            src="/zes-logo.png"
            alt="ZCOER"
            className="w-8 h-8 rounded object-contain border border-slate-200"
          />
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">ZCOER</p>
            <p className="text-[10px] text-slate-500">College ERP</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {activeNav.map((section, idx) => (
          <div key={idx}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.items.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{link.name}</span>
                    </div>
                    {link.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                        {link.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-slate-200">
        <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-slate-500 truncate">{role}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
