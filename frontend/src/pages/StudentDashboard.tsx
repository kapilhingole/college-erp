import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Library,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  ShieldCheck,
  FileText,
  CreditCard,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { apiClient } from '../api/client';

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/dashboards/student')
      .then((res) => setData(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <div className="w-10 h-10 border-4 border-zes-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Loading Student Portal...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Student Record Inaccessible</h3>
        <p className="text-xs text-slate-500 mt-1">Please ensure your institutional account is active.</p>
      </div>
    );
  }

  const { profile, attendance, fees, academics, library, todaySchedule, recentNotices } = data;

  return (
    <div className="space-y-7 pb-10">
      {/* 1. Student Hero Profile Card with ZES Logo */}
      <div className="bg-gradient-to-r from-zes-950 via-[#102747] to-zes-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-zes-950/30 border border-zes-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-zes-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <img
              src="/zes-logo.png"
              alt="Zeal Education Society"
              className="w-16 h-16 rounded-2xl bg-white p-1.5 object-contain shadow-lg shadow-zes-950/40 border border-zes-300 shrink-0 hidden sm:block"
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-zes-800 text-zes-200 border border-zes-600/70 px-3 py-1 rounded-full shadow-sm">
                  Student Portal
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Enrolled
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Welcome back, {profile.name}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-2">
                <span>PRN: <span className="font-mono text-white font-bold">{profile.enrollmentNumber || profile.rollNumber}</span></span>
                <span>•</span>
                <span>Roll: <span className="font-mono text-white font-bold">{profile.rollNumber}</span></span>
                <span>•</span>
                <span>{profile.department}</span>
                <span>•</span>
                <span>Semester {profile.currentSemester} ({profile.section || 'Division A'})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 text-right">
              <span className="text-[10px] font-bold text-zes-200 uppercase tracking-wider block">Cumulative SGPA</span>
              <span className="text-2xl font-black text-white block mt-0.5">
                {academics.latestResult?.cgpa?.toFixed(2) || '8.80'}
              </span>
              <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                Status: {academics.latestResult?.resultStatus || 'PASSED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATUTORY ATTENDANCE DEFAULTER WARNING (<75% Alert) */}
      {attendance.isDefaulter && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 text-slate-800 shadow-sm">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-rose-800 uppercase tracking-wide">
                  Attendance Alert: Below 75.0% Statutory Threshold
                </h3>
                <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                  SPPU Detention Risk
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Your cumulative attendance is at{' '}
                <strong className="text-rose-800 underline font-mono text-sm">{attendance.overallPercentage}%</strong> ({attendance.totalAttended} of {attendance.totalLectures} lectures). Under university statutory rules, you require at least <strong>4-8 additional lectures</strong> to reach the statutory 75% exam threshold.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-rose-700 font-medium">Please meet your Class Teacher &amp; Head of Department.</span>
                <NavLink
                  to="/attendance"
                  className="font-bold underline text-rose-800 hover:text-rose-950"
                >
                  View Attendance Breakdown →
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Academic Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Attendance Meter */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Attendance Health
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                attendance.isDefaulter
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {attendance.overallPercentage}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <div
                className={`h-2 rounded-full ${
                  attendance.isDefaulter ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, attendance.overallPercentage)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>{attendance.totalAttended} of {attendance.totalLectures} Lectures</span>
            <span
              className={`font-bold ${
                attendance.isDefaulter ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {attendance.isDefaulter ? 'Defaulter' : 'Good Standing'}
            </span>
          </div>
        </div>

        {/* Fee Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Fee Ledger Dues
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div
              className={`text-3xl font-black tracking-tight ${
                fees.hasOutstanding ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              ₹{fees.totalFeesDue.toLocaleString()}
            </div>
            <div className="mt-2 text-xs">
              <span
                className={`inline-block font-bold px-2 py-0.5 rounded ${
                  fees.hasOutstanding
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {fees.hasOutstanding ? 'Payment Overdue' : 'Fees Cleared'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Paid: ₹{fees.totalFeesPaid.toLocaleString()}</span>
            <NavLink to="/fees" className="font-bold text-zes-700 hover:text-zes-900 hover:underline">
              Pay Online →
            </NavLink>
          </div>
        </div>

        {/* Academic Credits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Earned Credits
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3 text-3xl font-black text-slate-900 tracking-tight">
            {academics.latestResult?.earnedCredits || 4}{' '}
            <span className="text-xs font-semibold text-slate-400">/ 4 Credits</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Semester 3</span>
            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">
              Grade Point: {academics.latestResult?.sgpa || 9.0}
            </span>
          </div>
        </div>

        {/* Library Circulations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Borrowed Books
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Library className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3 text-3xl font-black text-slate-900 tracking-tight">
            {library.currentlyIssuedBooks?.length || 0}{' '}
            <span className="text-xs font-semibold text-slate-400">Books Active</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Stack CS-1</span>
            <NavLink to="/library" className="font-bold text-amber-800 hover:underline">
              Library Portal →
            </NavLink>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Today's Lectures + Academic Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Left Column (8 cols): Today's Classes & Lecture Schedule */}
        <div className="lg:col-span-8 space-y-7">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-zes-100 text-zes-800 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Today's Classroom Schedule
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live timetable slots &amp; classroom locations
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Division A
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {todaySchedule && todaySchedule.length > 0 ? (
                todaySchedule.map((slot: any) => (
                  <div
                    key={slot.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-700 shrink-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Slot</span>
                        <span className="text-xs font-black">{slot.startTime?.split(':')[0]}h</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{slot.subject?.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-mono text-zes-800 font-semibold">{slot.subject?.code}</span> •{' '}
                          {slot.faculty ? `Prof. ${slot.faculty.firstName} ${slot.faculty.lastName}` : 'Faculty Assigned'} • {slot.startTime} - {slot.endTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                        {slot.roomNumber || 'Room 201'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  No active lectures scheduled for today.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Campus Bulletins */}
        <div className="lg:col-span-4 space-y-7">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h4 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-zes-700" />
              Institutional Bulletins
            </h4>
            <div className="divide-y divide-slate-100 mt-2">
              {recentNotices && recentNotices.length > 0 ? (
                recentNotices.map((n: any) => (
                  <div key={n.id} className="py-3 text-xs">
                    <p className="font-bold text-slate-900">{n.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{n.content}</p>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1.5">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No pending circulars.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
