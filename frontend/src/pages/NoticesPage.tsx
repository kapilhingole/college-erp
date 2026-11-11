import React, { useEffect, useState } from 'react';
import { Plus, Calendar, User } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'STUDENT' | 'FACULTY' | 'ADMIN'>('ALL');
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');

  const { user } = useAuth();
  const canPublish = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT' || user?.role === 'FACULTY';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [noticesRes, deptsRes] = await Promise.all([apiClient.get('/notices'), apiClient.get('/departments')]);
      setNotices(noticesRes.data.data); setDepartments(deptsRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/notices', { title, content, targetRole, targetDepartmentId: targetDepartmentId || null, priority });
      setShowModal(false); setTitle(''); setContent('');
      fetchData(); alert('Notice published!');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const priorityBadge: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-700',
    HIGH: 'bg-amber-100 text-amber-700',
    NORMAL: 'bg-slate-100 text-slate-600',
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Notice Board</h1>
          <p className="text-xs text-slate-500 mt-0.5">Campus announcements filtered by role and department</p>
        </div>
        {canPublish && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">
            <Plus className="w-3.5 h-3.5" /> Publish Notice
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading notices...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">No notices available.</div>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id} className={`bg-white rounded-xl border p-5 ${n.priority === 'URGENT' ? 'border-red-200' : n.priority === 'HIGH' ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${priorityBadge[n.priority]}`}>{n.priority}</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">To: {n.targetRole}</span>
                  {n.targetDepartmentId && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Dept. specific</span>}
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                  <Calendar className="w-3 h-3" />{new Date(n.publishedAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2">{n.title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">{n.content}</p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{n.author?.email}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Publish Notice</h3>
            <form onSubmit={handlePublish} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Title</label><input className={inputCls} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notice headline..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Target Audience</label>
                  <select className={inputCls} value={targetRole} onChange={(e) => setTargetRole(e.target.value as any)}>
                    <option value="ALL">All Campus</option><option value="STUDENT">Students</option><option value="FACULTY">Faculty</option><option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                    <option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Department (optional)</label>
                <select className={inputCls} value={targetDepartmentId} onChange={(e) => setTargetDepartmentId(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Content</label><textarea className={inputCls} rows={4} required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notice details..." /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
