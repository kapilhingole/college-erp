import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Search } from 'lucide-react';
import { apiClient } from '../api/client';

export const Leaderboard: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient
      .get('/students')
      .then((res) => {
        const sorted = [...(res.data.data || [])].sort((a: any, b: any) => {
          // Sort by enrollment number (newest first) as a default ranking
          return (b.enrollmentNumber || '').localeCompare(a.enrollmentNumber || '');
        });
        setStudents(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load leaderboard. Please check your connection.');
        setLoading(false);
      });
  }, []);

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.enrollmentNumber || '').toLowerCase().includes(q) ||
      (s.rollNumber || '').toLowerCase().includes(q) ||
      (s.department?.code || '').toLowerCase().includes(q)
    );
  });

  const top10 = filtered.slice(0, 10);

  const getRankIcon = (index: number) => {
    if (index === 0)
      return <Crown className="w-5 h-5 text-amber-400" />;
    if (index === 1)
      return <Medal className="w-5 h-5 text-slate-400" />;
    if (index === 2)
      return <Medal className="w-5 h-5 text-amber-600" />;
    return (
      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500">
        {index + 1}
      </span>
    );
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200';
    if (index === 1) return 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
    if (index === 2) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
    return 'bg-white border-slate-200/80';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <div className="w-10 h-10 border-4 border-zes-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Loading Leaderboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">Leaderboard Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-zes-950 via-[#102747] to-zes-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-zes-950/30 border border-zes-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-zes-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Student Leaderboard</h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Top performing students across all departments
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {students.length} Students Ranked
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ZPRN, roll number, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zes-500/40 focus:border-zes-500 transition"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Ranked', value: students.length, icon: TrendingUp, color: 'indigo' },
          { label: 'AIDS', value: students.filter((s) => s.department?.code === 'AIDS').length, icon: Trophy, color: 'emerald' },
          { label: 'COMP', value: students.filter((s) => s.department?.code === 'COMP').length, icon: Trophy, color: 'blue' },
          { label: 'ENTC / ECE', value: students.filter((s) => s.department?.code === 'ENTC' || s.department?.code === 'ECE').length, icon: Trophy, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Top 10 Rankings</h3>
              <p className="text-[11px] text-slate-500">Showing top students by enrollment</p>
            </div>
          </div>
        </div>

        {top10.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No students found</p>
            <p className="text-xs mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {top10.map((student, index) => (
              <div
                key={student.id}
                className={`flex items-center px-6 py-4 gap-4 hover:bg-slate-50/80 transition ${
                  index < 3 ? getRankBg(index) : ''
                }`}
              >
                {/* Rank */}
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  {getRankIcon(index)}
                </div>

                {/* Student Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {student.firstName} {student.lastName}
                    </h4>
                    {index === 0 && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                        #1
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ZPRN: <span className="font-mono font-semibold text-zes-700">{student.enrollmentNumber || '—'}</span>
                    <span className="mx-1.5">•</span>
                    Roll: <span className="font-semibold">{student.rollNumber || '—'}</span>
                  </p>
                </div>

                {/* Department Badge */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-zes-100 text-zes-800 px-2.5 py-1 rounded-full border border-zes-200">
                    {student.department?.code || '—'}
                  </span>
                </div>

                {/* Program & Batch */}
                <div className="hidden md:block text-right">
                  <p className="text-xs font-semibold text-slate-700">{student.program?.code || '—'}</p>
                  <p className="text-[10px] text-slate-400">{student.batch?.name || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
