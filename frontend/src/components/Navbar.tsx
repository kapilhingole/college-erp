import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, GraduationCap, Calendar, DollarSign, ShieldCheck, FileUp, Plus, X } from 'lucide-react';
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
      ? `${user.studentProfile.firstName} ${user.studentProfile.lastName}`
      : user?.facultyProfile
      ? `${user.facultyProfile.firstName} ${user.facultyProfile.lastName}`
      : user?.managementProfile
      ? `${user.managementProfile.firstName} ${user.managementProfile.lastName}`
      : user?.email?.split('@')[0] || 'User';

  const notifications = [
    { id: 1, title: 'Attendance Warning', desc: '25 students below 75% threshold.', time: '10m ago' },
    { id: 2, title: 'Exam Schedule Published', desc: 'B.E. Computer Engineering exams scheduled.', time: '1h ago' },
    { id: 3, title: 'Fee Collection', desc: '72% fee collection milestone reached.', time: '3h ago' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/students?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between sticky top-0 z-30">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative w-full max-w-sm">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search students, faculty..."
          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition"
        />
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Quick Action */}
        {isManagement && (
          <div className="relative">
            <button
              onClick={() => { setShowQuickActions(!showQuickActions); setShowNotifications(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Quick
            </button>
            {showQuickActions && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50">
                <div className="text-[10px] font-semibold text-slate-400 uppercase px-2 py-1">Actions</div>
                {[
                  { to: '/students', icon: GraduationCap, label: 'Student Directory' },
                  { to: '/attendance', icon: Calendar, label: 'Mark Attendance' },
                  { to: '/fees', icon: DollarSign, label: 'Collect Fee' },
                  { to: '/profile', icon: ShieldCheck, label: 'New Account' },
                  { to: '/data-sync', icon: FileUp, label: 'Import Data' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowQuickActions(false)}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    <item.icon className="w-3.5 h-3.5 text-slate-500" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowQuickActions(false); }}
            className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">Notifications</span>
                <button onClick={() => setShowNotifications(false)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
              </div>
              <div className="space-y-1 mt-1">
                {notifications.map((n) => (
                  <div key={n.id} className="px-2 py-2 hover:bg-slate-50 rounded-lg">
                    <div className="flex justify-between">
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{n.desc}</p>
                  </div>
                ))}
              </div>
              <Link to="/notices" onClick={() => setShowNotifications(false)} className="block text-center text-xs text-slate-500 hover:text-slate-800 pt-2 border-t border-slate-100 mt-1">
                View all notices
              </Link>
            </div>
          )}
        </div>

        {/* User */}
        <Link to="/profile" className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded-lg transition">
          <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
            {displayName.charAt(0)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{displayName}</p>
            <p className="text-[10px] text-slate-500">{role}</p>
          </div>
        </Link>

        <button
          onClick={logout}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
