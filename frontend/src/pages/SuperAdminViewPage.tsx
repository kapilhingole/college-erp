import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Filter, Download, Eye, FileSpreadsheet, TrendingUp, Building2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const inputCls =
  'px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

export const SuperAdminViewPage: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGEMENT';

  const [activeTab, setActiveTab] = useState<'attendance' | 'marks'>('attendance');
  const [loading, setLoading] = useState(false);

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attFilters, setAttFilters] = useState({
    departmentId: '',
    studentId: '',
    facultyId: '',
    subjectId: '',
    yearLabel: '',
    fromDate: '',
    toDate: '',
  });

  // Marks state
  const [marksRecords, setMarksRecords] = useState<any[]>([]);
  const [marksFilters, setMarksFilters] = useState({
    departmentId: '',
    studentId: '',
    facultyId: '',
    subjectId: '',
    examType: '',
    academicYear: '',
  });

  // Metadata
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // ----------------------------------------------------------------
  useEffect(() => {
    if (!isSuperAdmin) return;

    // Fetch master lists once
    Promise.all([
      apiClient.get('/departments'),
      apiClient.get('/academics/subjects'),
      apiClient.get('/faculty'),
      apiClient.get('/students'),
    ])
      .then(([dRes, sRes, fRes, stRes]) => {
        setDepartments(dRes.data.data ?? []);
        setSubjects(sRes.data.data ?? []);
        setFaculty(fRes.data.data ?? []);
        setStudents(stRes.data.data ?? []);
      })
      .catch((err) => console.error(err));
  }, [isSuperAdmin]);

  // ----------------------------------------------------------------
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params: any = {};
      Object.entries(attFilters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const res = await apiClient.get('/attendance/superadmin/all', { params });
      setAttendanceRecords(res.data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      Object.entries(marksFilters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const res = await apiClient.get('/marks/superadmin/all', { params });
      setMarksRecords(res.data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (activeTab === 'attendance') fetchAttendance();
    else fetchMarks();
  }, [activeTab]);

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8">
        <p className="text-sm font-semibold text-slate-700">
          Access Denied
        </p>
        <p className="text-xs text-slate-400 mt-1">
          This page is restricted to SUPER_ADMIN, ADMIN, and MANAGEMENT roles.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------------------
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) {
      alert('No data to export.');
      return;
    }
    const keys = Object.keys(data[0]);
    const csvRows = [keys.join(',')];
    data.forEach((row) => {
      const values = keys.map((k) => {
        const v = row[k];
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return String(v ?? '');
      });
      csvRows.push(values.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------------------
  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">SuperAdmin View</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive attendance and marks aggregation with multi-dimensional filtering
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'attendance'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Attendance
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'marks'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Marks
          </button>
          <NavLink
            to="/departments"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            <Building2 className="w-3.5 h-3.5" /> Department Architecture
          </NavLink>
        </div>
      </div>

      {/* ----------------------------------------------------------------
          ATTENDANCE VIEW
      ---------------------------------------------------------------- */}
      {activeTab === 'attendance' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-800">Filters</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                className={inputCls}
                value={attFilters.departmentId}
                onChange={(e) =>
                  setAttFilters({ ...attFilters, departmentId: e.target.value })
                }
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>

              <select
                className={inputCls}
                value={attFilters.facultyId}
                onChange={(e) =>
                  setAttFilters({ ...attFilters, facultyId: e.target.value })
                }
              >
                <option value="">All Faculty</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    Prof. {f.firstName} {f.lastName}
                  </option>
                ))}
              </select>

              <select
                className={inputCls}
                value={attFilters.subjectId}
                onChange={(e) =>
                  setAttFilters({ ...attFilters, subjectId: e.target.value })
                }
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>

              <select
                className={inputCls}
                value={attFilters.yearLabel}
                onChange={(e) =>
                  setAttFilters({ ...attFilters, yearLabel: e.target.value })
                }
              >
                <option value="">All Years</option>
                <option value="FY">First Year (FY)</option>
                <option value="SY">Second Year (SY)</option>
              </select>

              <input
                type="date"
                className={inputCls}
                value={attFilters.fromDate}
                onChange={(e) =>
                  setAttFilters({ ...attFilters, fromDate: e.target.value })
                }
                placeholder="From Date"
              />

              <input
                type="date"
                className={inputCls}
                value={attFilters.toDate}
                onChange={(e) =>
                  setAttFilters({ ...attFilters, toDate: e.target.value })
                }
                placeholder="To Date"
              />

              <button
                onClick={fetchAttendance}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
              >
                Apply Filters
              </button>

              <button
                onClick={() =>
                  exportToCSV(attendanceRecords, 'attendance-export.csv')
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                Attendance Records ({attendanceRecords.length})
              </p>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
              ) : attendanceRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  No records found. Adjust filters or clear them.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Roll No.</th>
                      <th className="py-2.5 px-4">Dept.</th>
                      <th className="py-2.5 px-4">Subject</th>
                      <th className="py-2.5 px-4">Faculty</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceRecords.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {new Date(rec.lectureSession.sessionDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {rec.student.firstName} {rec.student.lastName}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {rec.student.rollNumber}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                            {rec.student.department?.code}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {rec.lectureSession.subject.code} — {rec.lectureSession.subject.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          Prof. {rec.lectureSession.faculty.firstName}{' '}
                          {rec.lectureSession.faculty.lastName}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-700'
                                : rec.status === 'ABSENT'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[10px] text-slate-500">
                          {rec.lectureSession.timetableSlot?.yearLabel ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ----------------------------------------------------------------
          MARKS VIEW
      ---------------------------------------------------------------- */}
      {activeTab === 'marks' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-800">Filters</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                className={inputCls}
                value={marksFilters.departmentId}
                onChange={(e) =>
                  setMarksFilters({ ...marksFilters, departmentId: e.target.value })
                }
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>

              <select
                className={inputCls}
                value={marksFilters.subjectId}
                onChange={(e) =>
                  setMarksFilters({ ...marksFilters, subjectId: e.target.value })
                }
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>

              <select
                className={inputCls}
                value={marksFilters.facultyId}
                onChange={(e) =>
                  setMarksFilters({ ...marksFilters, facultyId: e.target.value })
                }
              >
                <option value="">All Faculty</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    Prof. {f.firstName} {f.lastName}
                  </option>
                ))}
              </select>

              <select
                className={inputCls}
                value={marksFilters.examType}
                onChange={(e) =>
                  setMarksFilters({ ...marksFilters, examType: e.target.value })
                }
              >
                <option value="">All Exam Types</option>
                <option value="MID_TERM">Mid Term</option>
                <option value="FINAL">Final</option>
                <option value="INTERNAL">Internal</option>
                <option value="PRACTICAL">Practical</option>
              </select>

              <input
                className={inputCls}
                value={marksFilters.academicYear}
                onChange={(e) =>
                  setMarksFilters({ ...marksFilters, academicYear: e.target.value })
                }
                placeholder="Academic Year (e.g., 2026-27)"
              />

              <button
                onClick={fetchMarks}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
              >
                Apply Filters
              </button>

              <button
                onClick={() => exportToCSV(marksRecords, 'marks-export.csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                Marks Records ({marksRecords.length})
              </p>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
              ) : marksRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  No records found. Adjust filters or clear them.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Roll No.</th>
                      <th className="py-2.5 px-4">Dept.</th>
                      <th className="py-2.5 px-4">Subject</th>
                      <th className="py-2.5 px-4">Exam</th>
                      <th className="py-2.5 px-4">Internal</th>
                      <th className="py-2.5 px-4">Theory</th>
                      <th className="py-2.5 px-4">Practical</th>
                      <th className="py-2.5 px-4">Total</th>
                      <th className="py-2.5 px-4">Grade</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Entered By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {marksRecords.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {m.student.firstName} {m.student.lastName}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {m.student.rollNumber}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                            {m.student.department?.code}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {m.examSchedule.subject.code} — {m.examSchedule.subject.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {m.examSchedule.exam.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{m.internalMarks}</td>
                        <td className="py-2.5 px-4 text-slate-600">{m.theoryMarks}</td>
                        <td className="py-2.5 px-4 text-slate-600">{m.practicalMarks}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{m.totalMarks}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            {m.letterGrade}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              m.status === 'PASS'
                                ? 'bg-emerald-100 text-emerald-700'
                                : m.status === 'FAIL'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 text-[10px]">
                          {m.enteredByFaculty
                            ? `Prof. ${m.enteredByFaculty.firstName} ${m.enteredByFaculty.lastName}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
