import React, { useEffect, useState } from 'react';
import { Bell, Plus, AlertCircle, Pin, Calendar, User, Tag } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'STUDENT' | 'FACULTY' | 'ADMIN'>('ALL');
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');

  const { user } = useAuth();
  const canPublish =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [noticesRes, deptsRes] = await Promise.all([
        apiClient.get('/notices'),
        apiClient.get('/departments'),
      ]);
      setNotices(noticesRes.data.data);
      setDepartments(deptsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/notices', {
        title,
        content,
        targetRole,
        targetDepartmentId: targetDepartmentId || null,
        priority,
      });

      setShowModal(false);
      setTitle('');
      setContent('');
      fetchData();
      alert('Announcement broadcasted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish announcement.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Notice Board</h1>
          <p className="text-xs text-slate-500 mt-1">
            Official announcements broadcasted and filtered by role (Student, Faculty, Admin) and Department
          </p>
        </div>

        {canPublish && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Publish Notice
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading notice board...</div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No notices currently active for your audience profile.
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => {
            const isHigh = n.priority === 'HIGH' || n.priority === 'URGENT';

            return (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition relative ${
                  isHigh ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        n.priority === 'URGENT'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : n.priority === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {n.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Audience: {n.targetRole}
                    </span>
                    {n.targetDepartmentId && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        Department Specific
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-400 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {new Date(n.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-base font-bold text-slate-900">{n.title}</h3>
                  <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-line">
                    {n.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    Published by: {n.author?.email}
                  </span>
                  <span className="font-mono">Authenticated Notice</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Publish Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Publish Targeted Campus Notice</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select target audience roles and departmental scoping
            </p>

            <form onSubmit={handlePublishNotice} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Headline / Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule for Mid-Term Practical Exams"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="ALL">All Campus (Everyone)</option>
                    <option value="STUDENT">Students Only</option>
                    <option value="FACULTY">Faculty Only</option>
                    <option value="ADMIN">Administrative Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Department (Optional)
                </label>
                <select
                  value={targetDepartmentId}
                  onChange={(e) => setTargetDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">All Departments (Campus-Wide)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Content
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detailed announcement content..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Broadcast Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

