import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, AlertTriangle, TrendingUp, PlusCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface TopicView {
  topicId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  allottedMinutes: number;
  allottedTimeLabel: string;
  status: 'PENDING' | 'DONE';
  completedAt: string | null;
  extraLoads: number;
  expiry: {
    shouldAddExtraLoad: boolean;
    isExpired: boolean;
    isOverdue: boolean;
    remainingMinutesInPeriod: number;
  };
}

interface ProgressSummary {
  totalTopics: number;
  completedTopics: number;
  pendingTopics: number;
  percentage: number;
  totalExtraLoads: number;
  overdueTopics: number;
}

interface MyLoad {
  profile: {
    facultyId: string;
    fullName: string;
    designation: string;
    department: { code: string; name: string };
  };
  topics: TopicView[];
  summary: ProgressSummary;
}

export const SyllabusLoadPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<MyLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchLoad = () => {
    setLoading(true);
    apiClient
      .get('/syllabus/me')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load your syllabus.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLoad();
  }, []);

  const markDone = async (topicId: string) => {
    setMarkingId(topicId);
    try {
      const res = await apiClient.post(`/syllabus/me/topics/${topicId}/done`);
      setData(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not mark topic done.');
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 max-w-md mx-auto">
        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">{error}</p>
        {user?.role !== 'FACULTY' && (
          <p className="text-xs text-slate-400 mt-1">This page is available to faculty accounts only.</p>
        )}
      </div>
    );
  }

  if (!data) return null;

  const { profile, topics, summary } = data;
  const pct = Math.round(summary.percentage);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">My Syllabus Load</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {profile.fullName} · {profile.designation} · {profile.department.name}
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
          {profile.facultyId}
        </span>
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Syllabus Progress</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{pct}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {summary.completedTopics}<span className="text-sm font-medium text-slate-400">/{summary.totalTopics}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">completed topics</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Pending</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary.pendingTopics}</p>
          <p className="text-[11px] text-slate-400 mt-1">not yet marked done</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Extra Loads</span>
            <PlusCircle className={`w-4 h-4 ${summary.totalExtraLoads > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${summary.totalExtraLoads > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {summary.totalExtraLoads}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">tracked, excluded from %</p>
        </div>
      </div>

      {/* Topics */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Topics</h2>
          </div>
          <span className="text-[11px] text-slate-400">Mark done for today once a topic is covered</span>
        </div>

        {topics.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            No topics assigned yet. Your academic load is empty.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {topics.map((t, i) => {
              const done = t.status === 'DONE';
              const overdue = t.expiry.isOverdue;
              const expired = t.expiry.isExpired && !done;
              return (
                <div key={t.topicId} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                    done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" /> {t.allottedTimeLabel}
                      </span>
                      {t.extraLoads > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          <PlusCircle className="w-3 h-3" /> {t.extraLoads} extra load{t.extraLoads > 1 ? 's' : ''}
                        </span>
                      )}
                      {expired && !overdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> time expired
                        </span>
                      )}
                      {overdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> overdue
                        </span>
                      )}
                      {!done && !expired && !overdue && t.expiry.remainingMinutesInPeriod > 0 && (
                        <span className="text-[10px] text-slate-400">
                          {t.expiry.remainingMinutesInPeriod} min left
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={done || markingId === t.topicId}
                    onClick={() => markDone(t.topicId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                      done
                        ? 'bg-emerald-50 text-emerald-600 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-700 text-white disabled:opacity-60'
                    }`}
                  >
                    {done ? 'Done' : markingId === t.topicId ? 'Marking…' : 'Mark Done'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 px-1">
        Extra loads are added automatically when a topic's allotted time expires without completion. They are tracked
        here but never count toward your syllabus percentage.
      </p>
    </div>
  );
};
