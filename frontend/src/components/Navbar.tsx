import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  LogOut,
  User,
  ShieldCheck,
  Plus,
  Building,
  GraduationCap,
  Calendar,
  DollarSign,
  AlertTriangle,
  X,
  ExternalLink,
  FileUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const role = (user?.role || '').toUpperCase();
  const isManagement = role === 'MANAGEMENT' || role === 'ADMIN' || role === 'SUPER_ADMIN';

  const displayName =
    user?.studentProfile
      ? `${user.studentProfile.firstName} ${user.studentProfile.lastName} (PRN: ${user.studentProfile.enrollmentNumber || user.studentProfile.rollNumber})`
      : user?.facultyProfile
      ? `Prof. ${user.facultyProfile.firstName} ${user.facultyProfile.lastName}`
      : user?.managementProfile
      ? `${user.managementProfile.firstName} ${user.managementProfile.lastName}`
      : user?.email?.split('@')[0] || 'User';

  const notifications = [
    {
      id: 1,
      title: 'Statutory Defaulter Warning',
      desc: '25 students have dropped below 75% attendance threshold in Term I.',
      time: '10m ago',
      type: 'danger',
    },
    {
      id: 2,
      title: 'In-Semester Examination (ISE)',
      desc: 'Exam schedule published for B.E. Computer Engineering & IT departments.',
      time: '1h ago',
      type: 'info',
    },
    {
      id: 3,
      title: 'Fee Collection Update',
      desc: '72% fee collection milestone reached for academic year 2024-25.',
      time: '3h ago',
      type: 'success',
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Default search routing to student directory with query
    navigate(`/students?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* 1. Global Search Bar */}
      <div className="flex items-center space-x-6 flex-1 max-w-xl">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students, PRN, faculty, invoices, records..."
            className="w-full pl-10 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600 transition-all shadow-inner"
          />
          <span className="absolute right-2.5 top-2.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300/60 select-none">
            Ctrl K
          </span>
        </form>

        <div className="hidden xl:flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-zes-50/70 px-3 py-1.5 rounded-xl border border-zes-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Term 1 (2024-25) • Induri Campus, Pune</span>
        </div>
      </div>

      {/* 2. Quick Action + Notifications + Profile Hub */}
      <div className="flex items-center space-x-3.5">
        {/* Quick Action Button */}
        {isManagement && (
          <div className="relative">
            <button
              onClick={() => {
                setShowQuickActions(!showQuickActions);
                setShowNotifications(false);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-zes-800 to-zes-700 hover:from-zes-900 hover:to-zes-800 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-sm shadow-zes-950/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Action</span>
            </button>

            {/* Quick Action Dropdown */}
            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Operations Command
                </div>
                <div className="space-y-1 py-1 text-xs">
                  <Link
                    to="/students"
                    onClick={() => setShowQuickActions(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 hover:bg-zes-50 text-slate-700 hover:text-zes-800 rounded-lg font-medium"
                  >
                    <GraduationCap className="w-4 h-4 text-zes-700" />
                    <span>Student Directory</span>
                  </Link>
                  <Link
                    to="/attendance"
                    onClick={() => setShowQuickActions(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 hover:bg-zes-50 text-slate-700 hover:text-zes-800 rounded-lg font-medium"
                  >
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Mark Lecture Attendance</span>
                  </Link>
                  <Link
                    to="/fees"
                    onClick={() => setShowQuickActions(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 hover:bg-zes-50 text-slate-700 hover:text-zes-800 rounded-lg font-medium"
                  >
                    <DollarSign className="w-4 h-4 text-zes-600" />
                    <span>Collect Student Fee</span>
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setShowQuickActions(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 hover:bg-zes-50 text-slate-700 hover:text-zes-800 rounded-lg font-medium"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Provision New Account</span>
                  </Link>
                  <Link
                    to="/data-sync"
                    onClick={() => setShowQuickActions(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 hover:bg-zes-50 text-slate-700 hover:text-zes-800 rounded-lg font-medium"
                  >
                    <FileUp className="w-4 h-4 text-indigo-600" />
                    <span>Import Data (PDF/Excel/CSV)</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowQuickActions(false);
            }}
            className="relative p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition"
            title="Campus Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-zes-600 rounded-full ring-2 ring-white animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-zes-600 rounded-full ring-2 ring-white" />
          </button>

          {/* Notifications Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Campus Alerts &amp; Notifications</span>
                <span className="text-[10px] font-semibold text-zes-700 bg-zes-50 px-2 py-0.5 rounded-full border border-zes-200">
                  3 Unread
                </span>
              </div>
              <div className="divide-y divide-slate-100 my-1 max-h-72 overflow-y-auto custom-scrollbar">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2.5 px-1 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/notices"
                onClick={() => setShowNotifications(false)}
                className="block text-center text-[11px] font-bold text-zes-700 hover:text-zes-900 pt-2 border-t border-slate-100"
              >
                View All Institutional Bulletins →
              </Link>
            </div>
          )}
        </div>

        {/* User Identity Chip */}
        <Link
          to="/profile"
          className="flex items-center space-x-3 pl-3 py-1.5 pr-2 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border border-slate-200 transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zes-800 to-zes-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {displayName.charAt(0)}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-zes-800 transition-colors">
              {displayName}
            </p>
            <span className="inline-block text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
              Role: {role}
            </span>
          </div>
        </Link>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2.5 text-slate-400 hover:text-zes-700 hover:bg-zes-50 rounded-xl transition border border-transparent hover:border-zes-200"
          title="Sign out of ERP session"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
