import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  Building,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  MapPin,
  Check,
} from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <div className="w-10 h-10 border-4 border-zes-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Loading Faculty Academic Command Hub...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">Unable to load faculty dashboard</h3>
        <p className="text-xs text-slate-500 mt-1">Please ensure your faculty profile is linked and active.</p>
      </div>
    );
  }

  const { profile, todaySchedule, assignedSubjects, recentNotices } = data;
  const loadPercentage = Math.round((profile.currentWeeklySlots / profile.maxWeeklyHours) * 100);

  return (
    <div className="space-y-7 pb-10">
      {/* 1. Faculty Hero Banner with ZES Logo */}
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
                  Academic Faculty Workspace
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Teaching Roster
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Welcome, {profile.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                <span>{profile.designation}</span>
                <span>•</span>
                <span>Department of {profile.department}</span>
                <span>•</span>
                <span className="font-mono text-zes-300 font-semibold">ID: {profile.employeeId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <NavLink
              to="/attendance"
              className="px-5 py-3 bg-gradient-to-r from-zes-600 to-zes-500 hover:from-zes-700 hover:to-zes-600 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-lg shadow-zes-950/40 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Lecture Attendance
            </NavLink>
          </div>
        </div>
      </div>

      {/* 2. Workload & Teaching Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Weekly Workload</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900">
              {profile.currentWeeklySlots} / {profile.maxWeeklyHours}{' '}
              <span className="text-xs font-semibold text-slate-400">Hrs/Wk</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  loadPercentage > 85 ? 'bg-amber-500' : 'bg-zes-600'
                }`}
                style={{ width: `${Math.min(100, loadPercentage)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Capacity Utilized</span>
            <span className="font-bold text-slate-800">{loadPercentage}%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Today's Sessions</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-3 text-3xl font-black text-slate-900">
            {todaySchedule.length}{' '}
            <span className="text-xs font-semibold text-slate-400">Lectures Scheduled</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Term I (SPPU)</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Ready to Mark
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Course Load</span>
            <BookOpen className="w-4 h-4 text-purple-600" />
          </div>
          <div className="my-3 text-3xl font-black text-slate-900">
            {assignedSubjects.length}{' '}
            <span className="text-xs font-semibold text-slate-400">Core Subjects</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Curriculum Code</span>
            <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
              2024-25 Syllabus
            </span>
          </div>
        </div>
      </div>

      {/* 3. Today's Lectures & Subject Rosters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Left Column (8 cols): Today's Schedule & Quick Action */}
        <div className="lg:col-span-8 space-y-7">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-zes-100 text-zes-800 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Today's Lecture Schedule
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live classroom time slots &amp; attendance submission status
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Monday Roster
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {todaySchedule.length > 0 ? (
                todaySchedule.map((slot: any) => (
                  <div
                    key={slot.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-700 shrink-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Room</span>
                        <span className="text-xs font-black">{slot.roomNumber?.split(' ')[1] || '201'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{slot.subject?.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-mono text-zes-800 font-semibold">{slot.subject?.code}</span> •{' '}
                          {slot.section?.name || 'Division A'} • {slot.startTime} - {slot.endTime}
                        </p>
                      </div>
                    </div>

                    <NavLink
                      to={`/attendance?subjectId=${slot.subjectId}&sectionId=${slot.sectionId}`}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs self-end sm:self-auto"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Take Attendance</span>
                    </NavLink>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  No active lectures scheduled for this faculty today.
                </div>
              )}
            </div>
          </div>

          {/* Assigned Subjects Matrix */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Allocated Syllabus &amp; Course Credits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignedSubjects.map((sub: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zes-800 bg-zes-50 px-2 py-0.5 rounded border border-zes-200">
                      {sub.code}
                    </span>
                    <span className="text-xs font-bold text-slate-600">{sub.credits} Credits</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-2">{sub.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">Semester {sub.semester} • Theory &amp; Lab Practical</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Department Bulletins & Class Reminders */}
        <div className="lg:col-span-4 space-y-7">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h4 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-zes-700" />
              Department Bulletins
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
                  No pending circulars for this department.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
