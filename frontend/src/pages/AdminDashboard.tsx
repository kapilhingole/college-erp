import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, GraduationCap, Activity, DollarSign, AlertTriangle, Download, FileSpreadsheet, Plus, Bell, FileUp } from 'lucide-react';
import { apiClient } from '../api/client';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/dashboards/admin')
      .then((res) => setData(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8">
        <p className="text-sm font-semibold text-slate-700">Dashboard data unavailable</p>
        <p className="text-xs text-slate-400 mt-1">Unable to connect to backend services.</p>
      </div>
    );
  }

  const { counts, fees, attendance } = data;

  const stats = [
    { label: 'Students', value: counts.students, icon: GraduationCap, sub: '5 Programs' },
    { label: 'Faculty', value: counts.faculty, icon: Users, sub: '5 Depts' },
    { label: 'Attendance', value: `${attendance.averagePercentage}%`, icon: Activity, sub: `${attendance.defaulterCount} defaulters` },
    { label: 'Fee Collected', value: `₹${(fees.totalCollected / 100000).toFixed(1)}L`, icon: DollarSign, sub: `${fees.collectionRatePercentage}% cleared` },
  ];

  const quickLinks = [
    { to: '/students', label: 'Admit Student', color: 'bg-slate-800 text-white', icon: Plus },
    { to: '/faculty', label: 'Onboard Faculty', color: 'bg-slate-100 text-slate-800', icon: Plus },
    { to: '/fees', label: 'Fee Structures', color: 'bg-slate-100 text-slate-800', icon: Plus },
    { to: '/notices', label: 'Broadcast Notice', color: 'bg-slate-100 text-slate-800', icon: Bell },
    { to: '/data-sync', label: 'Sync Data', color: 'bg-slate-100 text-slate-800', icon: FileUp },
    { to: '/reports', label: 'Export Reports', color: 'bg-slate-100 text-slate-800', icon: Download },
  ];

  const todayLiveSessions = [
    { time: '09:00 - 10:00', subject: 'Data Structures & Algorithms', faculty: 'Dr. Alan Turing', room: 'Room 201', status: 'COMPLETED' },
    { time: '10:00 - 11:00', subject: 'Object Oriented Java', faculty: 'Prof. Grace Hopper', room: 'Room 201', status: 'ONGOING' },
    { time: '11:15 - 12:15', subject: 'Database Management Systems', faculty: 'Prof. Rajesh Kulkarni', room: 'Lab IT-1', status: 'UPCOMING' },
    { time: '01:00 - 02:00', subject: 'Embedded Systems & IoT', faculty: 'Dr. Claude Shannon', room: 'Lab ENTC-2', status: 'UPCOMING' },
  ];

  const statusColor: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    ONGOING: 'bg-blue-100 text-blue-700',
    UPCOMING: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">Zeal College of Engineering and Research — Overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <s.icon className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-700 mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((q) => (
            <NavLink
              key={q.to}
              to={q.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80 ${q.color}`}
            >
              <q.icon className="w-3.5 h-3.5" />
              {q.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Today's schedule */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Today's Lecture Schedule</p>
          <NavLink to="/timetable" className="text-xs text-slate-500 hover:text-slate-800">View all →</NavLink>
        </div>
        <div className="divide-y divide-slate-100">
          {todayLiveSessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-500 w-24 shrink-0">{s.time}</span>

                <div>
                  <p className="text-xs font-semibold text-slate-800">{s.subject}</p>
                  <p className="text-[11px] text-slate-400">{s.faculty} · {s.room}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor[s.status]}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance alert */}
      {attendance.defaulterCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              {attendance.defaulterCount} students below 75% attendance threshold
            </p>
            <NavLink to="/reports" className="text-[11px] text-amber-700 underline mt-0.5 inline-block">
              Download defaulters list →
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
};
