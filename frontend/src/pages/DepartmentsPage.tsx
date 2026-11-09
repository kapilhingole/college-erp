import React, { useEffect, useState } from 'react';
import { Building2, Plus, ChevronRight, Layers, Users, BookOpen } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const fetchDepartments = () => {
    apiClient
      .get('/departments')
      .then((res) => setDepartments(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/departments', { code, name, description });
      setShowModal(false);
      setCode('');
      setName('');
      setDescription('');
      fetchDepartments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create department.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Hierarchy</h1>
          <p className="text-xs text-slate-500 mt-1">
            Department structure: College &rarr; Departments &rarr; Programs &rarr; Batches &rarr; Sections
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Department
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading department structures...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {dept.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">{dept.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {dept.description || 'No description provided.'}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-indigo-200 shrink-0" />
              </div>

              {/* Counts */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="font-bold text-slate-800">{dept._count?.students || 0}</div>
                  <div className="text-[11px] text-slate-400">Students</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="font-bold text-slate-800">{dept._count?.faculty || 0}</div>
                  <div className="text-[11px] text-slate-400">Faculty</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="font-bold text-slate-800">{dept._count?.subjects || 0}</div>
                  <div className="text-[11px] text-slate-400">Subjects</div>
                </div>
              </div>

              {/* Sub-Programs & Batches */}
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Degree Programs
                </h4>
                {dept.programs?.map((prog: any) => (
                  <div
                    key={prog.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                  >
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{prog.name}</span>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                        {prog.code}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {prog.batches?.map((b: any) => (
                        <span
                          key={b.id}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-600"
                        >
                          {b.name} (Sem {b.currentSemester})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal to Create Department */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Academic Department</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Code (e.g. CSE)
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CSE"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Computer Science & Engineering"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope, labs, research domains..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
