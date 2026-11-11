import React, { useEffect, useState } from 'react';
import { Users, Plus, Building, Award } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const FacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [qualification, setQualification] = useState('Ph.D in Computer Science');
  const [departmentId, setDepartmentId] = useState('');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(18);

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchFaculty = () => {
    setLoading(true);
    apiClient.get('/faculty').then((res) => setFaculty(res.data.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFaculty();
    apiClient.get('/departments').then((res) => {
      setDepartments(res.data.data);
      if (res.data.data.length > 0) setDepartmentId(res.data.data[0].id);
    });
  }, []);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/faculty', { firstName, lastName, email, phone, designation, qualification, departmentId, maxWeeklyHours: Number(maxWeeklyHours) });
      setShowModal(false); setFirstName(''); setLastName(''); setEmail(''); setPhone('');
      fetchFaculty(); alert('Faculty onboarded! Default password: Faculty@123');
    } catch (err: any) { alert(err.response?.data?.message || 'Onboarding failed.'); }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Faculty Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Professors, teaching load and departmental assignments</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">
            <Plus className="w-3.5 h-3.5" /> Onboard Faculty
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading faculty...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {faculty.map((f) => {
            const slotsCount = f._count?.timetableSlots || 0;
            const loadPct = Math.round((slotsCount / f.maxWeeklyHours) * 100);
            return (
              <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{f.employeeId}</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">Prof. {f.firstName} {f.lastName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{f.designation}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-slate-400" />{f.department?.name}</div>
                  <div className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-slate-400" />{f.qualification}</div>
                  <p className="text-[11px] text-slate-400">{f.email}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">Workload</span>
                    <span className="font-semibold text-slate-700">{slotsCount}/{f.maxWeeklyHours} hrs</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full ${loadPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, loadPct)}%` }} />
                  </div>
                </div>

                {f.subjectAssignments?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Subjects</p>
                    <div className="flex flex-wrap gap-1">
                      {f.subjectAssignments.map((a: any) => (
                        <span key={a.id} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{a.subject.code}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Onboard Faculty Member</h3>
            <form onSubmit={handleOnboard} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">First Name</label><input className={inputCls} required value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label><input className={inputCls} required value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Email</label><input type="email" className={inputCls} required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Phone</label><input className={inputCls} required value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <select className={inputCls} value={designation} onChange={(e) => setDesignation(e.target.value)}>
                    <option>Professor</option><option>Associate Professor</option><option>Assistant Professor</option><option>Professor & HOD</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Max Hrs/Week</label><input type="number" className={inputCls} min={1} max={40} value={maxWeeklyHours} onChange={(e) => setMaxWeeklyHours(Number(e.target.value))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Qualification</label><input className={inputCls} required value={qualification} onChange={(e) => setQualification(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <select className={inputCls} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">Onboard</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
