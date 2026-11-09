import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  DollarSign,
  AlertTriangle,
  Library,
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Download,
  AlertCircle,
  BarChart3,
  Search,
} from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <div className="w-10 h-10 border-4 border-zes-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Loading Administrative Dashboard...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Dashboard Data Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1">
          Unable to establish connection with ERP backend services. Please verify backend state.
        </p>
      </div>
    );
  }

  const { counts, fees, attendance, library, recentAudits } = data;

  const departmentsData = [
    { code: 'AIDS', name: 'Artificial Intelligence & Data Science', students: 25, faculty: 2, attendance: '89.2%', fees: '88%' },
    { code: 'COMP', name: 'Computer Engineering', students: 25, faculty: 2, attendance: '88.5%', fees: '85%' },
    { code: 'ENTC', name: 'Electronic & Telecommunication', students: 25, faculty: 1, attendance: '82.0%', fees: '70%' },
    { code: 'ECE', name: 'Electronic & Computer Engineering', students: 25, faculty: 1, attendance: '84.5%', fees: '76%' },
  ];

  const todayLiveSessions = [
    {
      time: '09:00 - 10:00',
      subject: 'Data Structures & Algorithms (CS301)',
      dept: 'CSE',
      room: 'Classroom 201',
      faculty: 'Dr. Alan Turing',
      status: 'COMPLETED',
      attendance: '90%',
    },
    {
      time: '10:00 - 11:00',
      subject: 'Object Oriented Java (CS302)',
      dept: 'CSE',
      room: 'Classroom 201',
      faculty: 'Prof. Grace Hopper',
      status: 'ONGOING',
      attendance: '85%',
    },
    {
      time: '11:15 - 12:15',
      subject: 'Database Management Systems (CS303)',
      dept: 'IT',
      room: 'Lab IT-1',
      faculty: 'Prof. Rajesh Kulkarni',
      status: 'UPCOMING',
      attendance: '—',
    },
    {
      time: '01:00 - 02:00',
      subject: 'Embedded Systems & IoT (EC301)',
      dept: 'ENTC',
      room: 'Lab ENTC-2',
      faculty: 'Dr. Claude Shannon',
      status: 'UPCOMING',
      attendance: '—',
    },
  ];

  return (
    <div className="space-y-7 pb-10">
      {/* 1. Hero Executive Command Header with Official ZES Logo */}
      <div className="bg-gradient-to-r from-zes-950 via-[#102747] to-zes-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-zes-950/30 border border-zes-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-zes-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-zes-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <img
              src="/zes-logo.png"
              alt="Zeal Education Society"
              className="w-16 h-16 rounded-2xl bg-white p-1.5 object-contain shadow-lg shadow-zes-950/40 border border-zes-300 shrink-0 hidden sm:block"
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-zes-800 text-zes-200 border border-zes-600/70 px-3 py-1 rounded-full shadow-sm">
                  Administration Overview
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  System Online
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Institutional Operations &amp; Governance
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Zeal College of Engineering and Research, Induri Campus, Pune • Savitribai Phule Pune University (SPPU)
                Real-time overview of enrolled students, faculty teaching load, academic attendance, and fee collections.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <NavLink
              to="/reports"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold tracking-wide transition border border-white/20 flex items-center gap-1.5 backdrop-blur-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download Defaulters (Excel)
            </NavLink>

            <NavLink
              to="/reports"
              className="px-4 py-2.5 bg-gradient-to-r from-zes-600 to-zes-500 hover:from-zes-700 hover:to-zes-600 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-lg shadow-zes-950/40 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Full Audit PDF
              <ArrowUpRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        </div>
      </div>

      {/* 2. Top-Tier KPI Metrics Grid with Zeal Cerulean Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {counts.students}
              <span className="text-sm font-semibold text-slate-400 ml-1.5">Active</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">5 B.E. Programs</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                100% Verified
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Faculty & Specialists */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Faculty Specialists
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {counts.faculty}
              <span className="text-sm font-semibold text-slate-400 ml-1.5">Members</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Avg Load: 16.5 Hrs/Wk</span>
              <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                5 Depts Active
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Statutory Attendance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Campus Attendance
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {attendance.averagePercentage}%
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">SPPU Threshold: 75%</span>
              <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {attendance.defaulterCount} Defaulters
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Fee Revenue Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Fee Collections
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{(fees.totalCollected / 100000).toFixed(2)} L
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Invoiced: ₹{(fees.totalBilled / 100000).toFixed(1)}L</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                {fees.collectionRatePercentage}% Cleared
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Operational Command Grid (Two Columns: 8 Cols vs 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT COLUMN: 8 Columns (Sessions, Departments, Financial Streams) */}
        <div className="lg:col-span-8 space-y-7">
          {/* A. Today's Academic & Lecture Schedule */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-zes-100 text-zes-800 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Real-Time Lecture &amp; Lab Schedule
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live classroom monitoring across academic divisions (SPPU Term I)
                  </p>
                </div>
              </div>
              <NavLink
                to="/timetable"
                className="text-xs font-bold text-zes-700 hover:text-zes-900 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Full Timetable</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {todayLiveSessions.map((session, sIdx) => (
                <div
                  key={sIdx}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                      {session.time}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{session.subject}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-slate-700">{session.faculty}</span>
                        <span>•</span>
                        <span>{session.room}</span>
                        <span>•</span>
                        <span className="text-zes-800 font-semibold">{session.dept}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Attendance</span>
                      <span className="text-xs font-black text-slate-800">{session.attendance}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        session.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : session.status === 'ONGOING'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* B. Department Academic Health Matrix */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Department Health &amp; Compliance Matrix
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Academic and fee compliance across engineering departments
                  </p>
                </div>
              </div>
              <NavLink
                to="/departments"
                className="text-xs font-bold text-zes-700 hover:text-zes-900 flex items-center gap-1"
              >
                <span>View All Depts</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            <div className="overflow-x-auto custom-scrollbar mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Students</th>
                    <th className="py-2.5 px-3">Faculty</th>
                    <th className="py-2.5 px-3">Avg Attendance</th>
                    <th className="py-2.5 px-3">Fee Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {departmentsData.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{d.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-semibold">{d.code}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">{d.students}</td>
                      <td className="py-3 px-3">{d.faculty} Faculty</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: d.attendance }}
                            />
                          </div>
                          <span className="font-bold text-slate-800">{d.attendance}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full"
                              style={{ width: d.fees }}
                            />
                          </div>
                          <span className="font-bold text-slate-800">{d.fees}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* C. Real-Time Financial Ledger & Recent Invoices */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Recent Tuition Receipts &amp; Collections
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live stream of fee transactions approved by Finance Desk
                  </p>
                </div>
              </div>
              <NavLink
                to="/fees"
                className="text-xs font-bold text-zes-700 hover:text-zes-900 flex items-center gap-1"
              >
                <span>Full Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Billed Invoices
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  ₹{fees.totalBilled.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">100 Annual Invoices</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Realized Revenue
                </span>
                <span className="text-xl font-black text-emerald-950 mt-1 block">
                  ₹{fees.totalCollected.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                  {fees.collectionRatePercentage}% Cleared into Bank
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                  Overdue Receivables
                </span>
                <span className="text-xl font-black text-rose-950 mt-1 block">
                  ₹{fees.totalOutstanding.toLocaleString()}
                </span>
                <span className="text-[10px] text-rose-700 font-semibold mt-1 block">
                  ~25 Defaulter Ledgers
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4 Columns (Alerts, Library, Audits) */}
        <div className="lg:col-span-4 space-y-7">
          {/* D. Attendance Defaulter Alert Panel (<75%) */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-rose-200 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                  Attendance Defaulter Alert
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Action Required
              </span>
            </div>

            <div className="my-4">
              <div className="text-4xl font-black text-slate-900 tracking-tight">
                {attendance.defaulterCount}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Students currently below the statutory <strong>75.0% SPPU attendance threshold</strong> in Term I.
              </p>
            </div>

            <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>Classroom Recovery:</span>
                <span className="font-mono font-bold text-slate-900">4-8 Lectures Req.</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>Notification Status:</span>
                <span className="text-emerald-700 font-bold">Dispatched</span>
              </div>
            </div>

            <NavLink
              to="/attendance"
              className="mt-4 w-full py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold uppercase tracking-wider text-center block transition shadow-sm"
            >
              Inspect Defaulter Roster →
            </NavLink>
          </div>

          {/* E. Library & Resource Circulation */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Library className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-extrabold text-slate-900">Library Assets</h4>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Stack CS/Eng
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-2xl font-black text-slate-800 block">
                  {library.totalBookTitles}
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                  Titles Cataloged
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-center">
                <span className="text-2xl font-black text-amber-900 block">
                  {library.currentlyBorrowed}
                </span>
                <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
                  In Circulation
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Overdue Fine Policy:</span>
              <span className="font-bold text-slate-800">₹5.00 / Day</span>
            </div>
          </div>

          {/* F. Live System Audit Stream (Behance Activity Feed Style) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-extrabold text-slate-900">Security Audit Trail</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Real-time</span>
            </div>

            <div className="divide-y divide-slate-100 mt-2 max-h-80 overflow-y-auto custom-scrollbar">
              {recentAudits && recentAudits.length > 0 ? (
                recentAudits.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {log.userEmail || 'System'} • {log.module}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No recent audit events logged.
                </div>
              )}
            </div>

            <NavLink
              to="/reports"
              className="mt-3 block text-center text-xs font-bold text-indigo-700 hover:text-indigo-900 pt-2 border-t border-slate-100"
            >
              View Full Security Audit Log →
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
