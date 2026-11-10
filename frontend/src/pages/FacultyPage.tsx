import React, { useEffect, useState } from 'react';
import { Users, Plus, BookOpen, Clock, Building, Award } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const FacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
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
    apiClient
      .get('/faculty')
      .then((res) => setFaculty(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFaculty();
    apiClient.get('/departments').then((res) => {
      setDepartments(res.data.data);
      if (res.data.data.length > 0) {
        setDepartmentId(res.data.data[0].id);
      }
    });
  }, []);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/faculty', {
        firstName,
        lastName,
        email,
        phone,
        designation,
        qualification,
        departmentId,
        maxWeeklyHours: Number(maxWeeklyHours),
      });

      setShowModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      fetchFaculty();
      alert('Faculty member onboarded! Default password: Faculty@123');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Onboarding failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Professors, teaching load distribution, and departmental assignments
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Onboard Faculty Member
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading faculty roster...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faculty.map((f) => {
            const slotsCount = f._count?.timetableSlots || 0;
            const loadPct = Math.round((slotsCount / f.maxWeeklyHours) * 100);

            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {f.employeeId}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">
                        Prof. {f.firstName} {f.lastName}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {f.designation}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    <div className="flex items-center">
                      <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {f.department?.name}
                    </div>
                    <div className="flex items-center">
                      <Award className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {f.qualification}
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1">{f.email}</div>
                  </div>

                  {/* Workload Meter */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Workload Meter</span>
                      <span className="font-bold text-slate-800">
                        {slotsCount} / {f.maxWeeklyHours} hrs
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          loadPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, loadPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Subject Assignments */}
                  <div className="mt-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Assigned Subjects
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {f.subjectAssignments?.length === 0 ? (
                        <span className="text-xs text-slate-400">No subjects assigned yet</span>
                      ) : (
                        f.subjectAssignments?.map((a: any) => (
                          <span
                            key={a.id}
                            className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 font-medium"
                          >
                            {a.subject.code}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Onboarding Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Faculty Member Onboarding</h3>
            <p className="text-xs text-slate-500 mb-4">
              Issues institutional faculty credentials and maps to academic department
            </p>
            <form onSubmit={handleOnboard} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="professor@college.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Professor & HOD">Professor &amp; HOD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Hours/Week
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={maxWeeklyHours}
                    onChange={(e) => setMaxWeeklyHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Highest Qualification
                </label>
                <input
                  type="text"
                  required
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="Ph.D in Computer Science"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
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
                  Onboard Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
