import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, DollarSign, BookOpen, Library } from 'lucide-react';
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
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8">
        <p className="text-sm font-semibold text-slate-700">Student record inaccessible</p>
        <p className="text-xs text-slate-400 mt-1">Please ensure your institutional account is active.</p>
      </div>
    );
  }

  const { profile, attendance, fees, academics, library, todaySchedule, recentNotices } = data;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">Welcome, {profile.name}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          PRN: {profile.enrollmentNumber || profile.rollNumber} · {profile.department} · Semester {profile.currentSemester}
        </p>
      </div>

      {/* Attendance defaulter warning */}
      {attendance.isDefaulter && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-800">
              Attendance below 75% — {attendance.overallPercentage}% ({attendance.totalAttended}/{attendance.totalLectures} lectures)
            </p>
            <p className="text-[11px] text-red-700 mt-0.5">Risk of exam debarment. Meet your HOD immediately.</p>
            <NavLink to="/attendance" className="text-[11px] text-red-800 underline mt-1 inline-block">View attendance breakdown →</NavLink>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Attendance</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className={`text-2xl font-bold ${attendance.isDefaulter ? 'text-red-600' : 'text-emerald-600'}`}>
            {attendance.overallPercentage}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${attendance.isDefaulter ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, attendance.overallPercentage)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{attendance.totalAttended}/{attendance.totalLectures} lectures</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Fee Balance</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className={`text-2xl font-bold ${fees.hasOutstanding ? 'text-red-600' : 'text-slate-900'}`}>
            ₹{fees.totalFeesDue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{fees.hasOutstanding ? 'Payment overdue' : 'Fees cleared'}</p>
          <NavLink to="/fees" className="text-[11px] text-slate-500 underline mt-0.5 inline-block">Pay online →</NavLink>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">CGPA</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{academics.latestResult?.cgpa?.toFixed(2) || '—'}</p>
          <p className="text-[11px] text-slate-400 mt-1">{academics.latestResult?.resultStatus || 'No results yet'}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Library</span>
            <Library className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{library.currentlyIssuedBooks?.length || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Books borrowed</p>
          <NavLink to="/library" className="text-[11px] text-slate-500 underline mt-0.5 inline-block">Library portal →</NavLink>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Today's Classes</p>
          </div>
          <div className="divide-y divide-slate-100">
            {todaySchedule && todaySchedule.length > 0 ? (
              todaySchedule.map((slot: any) => (
                <div key={slot.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-slate-500">Slot</span>
                      <span className="text-xs font-bold text-slate-700">{slot.startTime?.split(':')[0]}h</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{slot.subject?.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {slot.subject?.code} · {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{slot.roomNumber || 'Room 201'}</span>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">No classes scheduled today.</div>
            )}
          </div>
        </div>

        {/* Bulletins */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Notices</p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentNotices && recentNotices.length > 0 ? (
              recentNotices.map((n: any) => (
                <div key={n.id} className="px-5 py-3">
                  <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">No notices.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
