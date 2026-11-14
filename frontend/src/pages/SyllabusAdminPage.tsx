import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  TrendingUp,
  CheckCircle2,
  PlusCircle,
  AlertTriangle,
  Settings2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../api/client';

interface FacultySummary {
  facultyId: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  department: { code: string; name: string };
  status: string;
  summary: {
    totalTopics: number;
    completedTopics: number;
    pendingTopics: number;
    percentage: number;
    totalExtraLoads: number;
    overdueTopics: number;
  };
}

interface OverviewTotals {
  facultyCount: number;
  totalExtraLoads: number;
  averagePercentage: number;
}

interface FacultyDetail {
  profile: {
    id: string;
    facultyId: string;
    fullName: string;
    designation: string;
    department: { code: string; name: string };
    status: string;
  };
  topics: {
    topicId: string;
    title: string;
    allottedMinutes: number;
    allottedTimeLabel: string;
    status: 'PENDING' | 'DONE';
    completedAt: string | null;
    extraLoads: number;
  }[];
  summary: FacultySummary['summary'];
}

interface LoadRow {
  title: string;
  allottedMinutes: number;
}

const baseInputCls = 'px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';
const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';
const btnPrimary = 'px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-60';
const btnGhost = 'px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition';

export const SyllabusAdminPage: React.FC = () => {
  const [faculty, setFaculty] = useState<FacultySummary[]>([]);
  const [totals, setTotals] = useState<OverviewTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProvision, setShowProvision] = useState(false);
  const [manage, setManage] = useState<FacultyDetail | null>(null);

  const fetchOverview = () => {
    setLoading(true);
    apiClient
      .get('/syllabus')
      .then((res) => {
        setFaculty(res.data.data.faculty);
        setTotals(res.data.data.totals);
      })
      .catch((err) => alert(err.response?.data?.message || 'Failed to load faculty progress.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const openManage = async (facultyId: string) => {
    try {
      const res = await apiClient.get(`/syllabus/faculty/${facultyId}`);
      setManage(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to open faculty detail.');
    }
  };

  const refreshManage = async (facultyId: string) => {
    const res = await apiClient.get(`/syllabus/faculty/${facultyId}`);
    setManage(res.data.data);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Syllabus Progress Oversight</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every faculty member's academic load, completion percentage and extra-load count
          </p>
        </div>
        <button onClick={() => setShowProvision(true)} className={btnPrimary + ' flex items-center gap-1.5'}>
          <Plus className="w-3.5 h-3.5" /> Provision Faculty
        </button>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <span className="text-xs text-slate-500">Faculty Tracked</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totals.facultyCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <span className="text-xs text-slate-500">Average Progress</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{Math.round(totals.averagePercentage)}%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <span className="text-xs text-slate-500">Total Extra Loads</span>
            <p className={`text-2xl font-bold mt-1 ${totals.totalExtraLoads > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {totals.totalExtraLoads}
            </p>
          </div>
        </div>
      )}

      {/* Faculty grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading faculty progress…</div>
      ) : faculty.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8">
          <p className="text-sm font-semibold text-slate-700">No faculty members with a syllabus load yet.</p>
          <p className="text-xs text-slate-400 mt-1">Provision a faculty member to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {faculty.map((f) => {
            const pct = Math.round(f.summary.percentage);
            return (
              <div key={f.facultyId} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{f.employeeId}</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{f.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{f.designation} · {f.department.code}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${f.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {f.status}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-semibold text-slate-700">
                      {f.summary.completedTopics}/{f.summary.totalTopics} · {pct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><PlusCircle className="w-3 h-3" /> {f.summary.totalExtraLoads} extra</span>
                  {f.summary.overdueTopics > 0 && (
                    <span className="inline-flex items-center gap-1 text-red-600"><AlertTriangle className="w-3 h-3" /> {f.summary.overdueTopics} overdue</span>
                  )}
                </div>

                <button onClick={() => openManage(f.facultyId)} className={btnGhost + ' w-full mt-4 flex items-center justify-center gap-1.5'}>
                  <Settings2 className="w-3.5 h-3.5" /> Manage Load
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showProvision && (
        <ProvisionModal
          onClose={() => setShowProvision(false)}
          onCreated={() => {
            setShowProvision(false);
            fetchOverview();
          }}
        />
      )}

      {manage && (
        <ManageModal
          detail={manage}
          onClose={() => setManage(null)}
          onChanged={() => {
            refreshManage(manage.profile.id);
            fetchOverview();
          }}
        />
      )}
    </div>
  );
};

// ── Provision modal ──────────────────────────────────────────

const ProvisionModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [facultyId, setFacultyId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Faculty@123');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [topics, setTopics] = useState<LoadRow[]>([{ title: '', allottedMinutes: 60 }]);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTopics = topics
      .filter((t) => t.title.trim() && t.allottedMinutes > 0)
      .map((t, i) => ({ title: t.title.trim(), allottedMinutes: Number(t.allottedMinutes), orderIndex: i }));
    setSaving(true);
    try {
      await apiClient.post('/syllabus/faculty', {
        facultyId: facultyId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        designation,
        phone,
        qualification,
        topics: cleanTopics,
      });
      alert('Faculty member provisioned. They can log in with their faculty ID and password.');
      onCreated();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Provisioning failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4" /> Provision Faculty Member</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Faculty ID (login)</label>
              <input className={inputCls} required value={facultyId} onChange={(e) => setFacultyId(e.target.value)} placeholder="FAC-2026-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input className={inputCls} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">First Name</label><input className={inputCls} required value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label><input className={inputCls} required value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Email</label><input type="email" className={inputCls} required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Phone</label><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Designation</label><input className={inputCls} value={designation} onChange={(e) => setDesignation(e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Qualification</label><input className={inputCls} value={qualification} onChange={(e) => setQualification(e.target.value)} /></div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700 mb-2">Initial Academic Load (topics)</p>
            <div className="space-y-2">
              {topics.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      className={baseInputCls + ' w-full'}
                      placeholder="Topic / unit title"
                      value={t.title}
                      onChange={(e) => setTopics((p) => p.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))}
                    />
                  </div>
                  <div className="w-28 shrink-0 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      className={baseInputCls + ' w-full'}
                      placeholder="Minutes"
                      value={t.allottedMinutes}
                      onChange={(e) => setTopics((p) => p.map((r, j) => (j === i ? { ...r, allottedMinutes: Number(e.target.value) } : r)))}
                    />
                    <span className="text-[11px] text-slate-400 font-medium">min</span>
                  </div>
                  <button type="button" onClick={() => setTopics((p) => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 p-1">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setTopics((p) => [...p, { title: '', allottedMinutes: 60 }])} className={btnGhost + ' flex items-center gap-1'}>
                <Plus className="w-3 h-3" /> Add Topic
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary + ' flex items-center gap-1.5'}>
              <Plus className="w-3.5 h-3.5" /> {saving ? 'Provisioning…' : 'Provision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Manage modal (load editor, reset password, audited override) ─

const ManageModal: React.FC<{ detail: FacultyDetail; onClose: () => void; onChanged: () => void }> = ({
  detail,
  onClose,
  onChanged,
}) => {
  const fid = detail.profile.id;
  const [load, setLoad] = useState<LoadRow[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [overrideTopicId, setOverrideTopicId] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<'DONE' | 'PENDING'>('DONE');
  const [overrideNote, setOverrideNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setLoad(detail.topics.map((t) => ({ title: t.title, allottedMinutes: t.allottedMinutes })));
    setOverrideTopicId(detail.topics[0]?.topicId || '');
  }, [detail]);

  const saveLoad = async () => {
    const clean = load.filter((t) => t.title.trim() && t.allottedMinutes > 0).map((t, i) => ({
      title: t.title.trim(), allottedMinutes: Number(t.allottedMinutes), orderIndex: i,
    }));
    setBusy('load');
    try {
      await apiClient.put(`/syllabus/faculty/${fid}/load`, { topics: clean });
      onChanged();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not save load.');
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setBusy('pw');
    try {
      await apiClient.put(`/syllabus/faculty/${fid}`, { password: newPassword });
      setNewPassword('');
      alert('Password reset. The faculty member must use the new password to log in.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not reset password.');
    } finally {
      setBusy(null);
    }
  };

  const applyOverride = async () => {
    if (!overrideTopicId) {
      alert('Select a topic to override.');
      return;
    }
    setBusy('override');
    try {
      await apiClient.post(`/syllabus/faculty/${fid}/topics/${overrideTopicId}/override`, {
        status: overrideStatus,
        note: overrideNote || undefined,
      });
      setOverrideNote('');
      onChanged();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Override failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{detail.profile.fullName}</h3>
            <p className="text-xs text-slate-500">
              {detail.profile.facultyId} · {detail.profile.designation} · {detail.profile.department.name}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">✕</button>
        </div>

        {/* Progress snapshot */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-50 rounded-lg p-3">
            <span className="text-[11px] text-slate-500">Progress</span>
            <p className="text-lg font-bold text-slate-900">{Math.round(detail.summary.percentage)}%</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <span className="text-[11px] text-slate-500">Completed</span>
            <p className="text-lg font-bold text-slate-900">{detail.summary.completedTopics}/{detail.summary.totalTopics}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <span className="text-[11px] text-slate-500">Extra Loads</span>
            <p className={`text-lg font-bold ${detail.summary.totalExtraLoads > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{detail.summary.totalExtraLoads}</p>
          </div>
        </div>

        {/* Load editor */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Academic Load</p>
          <div className="space-y-2">
            {load.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <input
                    className={baseInputCls + ' w-full'}
                    placeholder="Topic / unit title"
                    value={t.title}
                    onChange={(e) => setLoad((p) => p.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))}
                  />
                </div>
                <div className="w-28 shrink-0 flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    className={baseInputCls + ' w-full'}
                    placeholder="Minutes"
                    value={t.allottedMinutes}
                    onChange={(e) => setLoad((p) => p.map((r, j) => (j === i ? { ...r, allottedMinutes: Number(e.target.value) } : r)))}
                  />
                  <span className="text-[11px] text-slate-400 font-medium">min</span>
                </div>
                {detail.topics[i] && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${detail.topics[i].status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {detail.topics[i].status}
                  </span>
                )}
                <button type="button" onClick={() => setLoad((p) => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 p-1">✕</button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => setLoad((p) => [...p, { title: '', allottedMinutes: 60 }])} className={btnGhost + ' flex items-center gap-1'}>
                <Plus className="w-3 h-3" /> Add Topic
              </button>
              <button type="button" onClick={saveLoad} disabled={busy === 'load'} className={btnPrimary + ' flex items-center gap-1.5'}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {busy === 'load' ? 'Saving…' : 'Save Load'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Saving replaces the entire load. Existing completion records for removed topics are cleared.</p>
          </div>
        </div>

        {/* Reset password */}
        <div className="mb-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Reset Credentials</p>
          <div className="flex items-center gap-2">
            <input type="password" className={inputCls + ' flex-1'} placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <button type="button" onClick={resetPassword} disabled={busy === 'pw'} className={btnPrimary + ' flex items-center gap-1.5'}>
              <KeyRound className="w-3.5 h-3.5" /> {busy === 'pw' ? 'Resetting…' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Override completion (audited) */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Override Completion Record</p>
          <p className="text-[11px] text-amber-600 mb-2">Every override is written to an immutable audit trail (who, what, when, old &amp; new values).</p>
          <div className="grid grid-cols-12 gap-2">
            <select className={inputCls + ' col-span-5'} value={overrideTopicId} onChange={(e) => setOverrideTopicId(e.target.value)}>
              <option value="">Select topic…</option>
              {detail.topics.map((t) => (
                <option key={t.topicId} value={t.topicId}>{t.title} ({t.status})</option>
              ))}
            </select>
            <select className={inputCls + ' col-span-3'} value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as 'DONE' | 'PENDING')}>
              <option value="DONE">Mark Done</option>
              <option value="PENDING">Revert to Pending</option>
            </select>
            <input className={inputCls + ' col-span-3'} placeholder="Note" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
            <button type="button" onClick={applyOverride} disabled={busy === 'override'} className={btnPrimary + ' col-span-1 flex items-center justify-center'}>
              {busy === 'override' ? '…' : 'Go'}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="button" onClick={onClose} className={btnGhost}>Close</button>
        </div>
      </div>
    </div>
  );
};
