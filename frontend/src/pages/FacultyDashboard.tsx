import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, BookOpen, TrendingUp, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

export const FacultyDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/dashboards/faculty')
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
        <p className="text-sm font-semibold text-slate-700">Unable to load faculty dashboard</p>
        <p className="text-xs text-slate-400 mt-1">Please ensure your faculty profile is linked and active.</p>
      </div>
    );
  }

  const { profile, todaySchedule, assignedSubjects, recentNotices } = data;
  const loadPercentage = Math.round((profile.currentWeeklySlots / profile.maxWeeklyHours) * 100);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Welcome, {profile.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{profile.designation} · {profile.department}</p>
        </div>
        <NavLink
          to="/attendance"
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark Attendance
        </NavLink>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Weekly Load</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{profile.currentWeeklySlots}<span className="text-sm font-normal text-slate-400">/{profile.maxWeeklyHours} hrs</span></p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full ${loadPercentage > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, loadPercentage)}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Today's Sessions</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{todaySchedule.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Lectures scheduled</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Subjects</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{assignedSubjects.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Assigned this term</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Today's Schedule</p>
          </div>
          <div className="divide-y divide-slate-100">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((slot: any) => (
                <div key={slot.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{slot.subject?.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{slot.subject?.code} · {slot.section?.name || 'Division A'} · {slot.startTime} - {slot.endTime}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{slot.roomNumber || 'Room 201'}</span>
                    <NavLink
                      to={`/attendance?subjectId=${slot.subjectId}&sectionId=${slot.sectionId}`}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-700 text-white rounded text-[11px] font-medium transition"
                    >
                      Attend
                    </NavLink>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">No lectures scheduled today.</div>
            )}
          </div>
        </div>

        {/* Bulletins */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Bulletins</p>
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
              <div className="py-10 text-center text-xs text-slate-400">No bulletins.</div>
            )}
          </div>
        </div>
      </div>

      {/* Assigned Subjects */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-800 mb-3">Assigned Subjects</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assignedSubjects.map((sub: any, idx: number) => (
            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-600">{sub.code}</span>
                <span className="text-[10px] text-slate-500">{sub.credits} cr</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-1">{sub.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Semester {sub.semester}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
