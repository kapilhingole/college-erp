import React, { useEffect, useState } from 'react';
import { Trophy, Search } from 'lucide-react';
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

  const rankLabel = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <div className="w-8 h-8 border-4 border-zes-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
        <p className="text-sm font-semibold text-slate-700">Leaderboard Unavailable</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Student Leaderboard</h1>
          <p className="text-xs text-slate-500">{students.length} students ranked</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, ZPRN, roll number, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-zes-500/40 focus:border-zes-500 transition"
        />
      </div>

      {/* Leaderboard List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Top 10 Rankings</p>
        </div>

        {top10.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No students found</p>
            <p className="text-xs mt-0.5">Try adjusting your search.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {top10.map((student, index) => (
              <li
                key={student.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition ${
                  index === 0 ? 'bg-amber-50/60' : index === 1 ? 'bg-slate-50/60' : index === 2 ? 'bg-orange-50/60' : ''
                }`}
              >
                {/* Rank */}
                <span className="w-8 text-center text-base font-bold text-slate-500 shrink-0">
                  {rankLabel(index)}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ZPRN: <span className="font-mono text-zes-700">{student.enrollmentNumber || '—'}</span>
                    <span className="mx-1">·</span>
                    Roll: {student.rollNumber || '—'}
                  </p>
                </div>

                {/* Dept & Program */}
                <div className="text-right shrink-0">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {student.department?.code || '—'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {student.program?.code || ''} {student.batch?.name || ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
