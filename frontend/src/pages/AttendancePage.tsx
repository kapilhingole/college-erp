import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  Plus,
  Filter,
  Lock,
  ShieldCheck,
  BookOpen,
  UserCheck,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isFacultyOrAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGEMENT' ||
    user?.role === 'FACULTY';

  // -------------------------------------------------------------
  // FACULTY & MANAGEMENT STATE
  // -------------------------------------------------------------
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'mark' | 'defaulters'>('mark');

  // New session state
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('09:00 - 10:00');
  const [topicCovered, setTopicCovered] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<{ [studentId: string]: string }>({});

  // -------------------------------------------------------------
  // STUDENT STATE (STRICTLY READ-ONLY)
  // -------------------------------------------------------------
  const [studentData, setStudentData] = useState<any | null>(null);
  const [studentSubjectFilter, setStudentSubjectFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      const [subsRes, deptsRes, studentsRes, defRes] = await Promise.all([
        apiClient.get('/academics/subjects'),
        apiClient.get('/departments'),
        apiClient.get('/students'),
        apiClient.get('/attendance/defaulters'),
      ]);

      setSubjects(subsRes.data.data);
      setStudents(studentsRes.data.data);
      setDefaulters(defRes.data.data);

      const allSecs: any[] = [];
      deptsRes.data.data.forEach((d: any) => {
        d.programs?.forEach((p: any) => {
          p.batches?.forEach((b: any) => {
            b.sections?.forEach((s: any) => {
              allSecs.push({ ...s, progName: p.name });
            });
          });
        });
      });
      setSections(allSecs);

      if (subsRes.data.data.length > 0) setSelectedSubjectId(subsRes.data.data[0].id);
      if (allSecs.length > 0) setSelectedSectionId(allSecs[0].id);

      // Default all students to PRESENT
      const initialMap: { [key: string]: string } = {};
      studentsRes.data.data.forEach((s: any) => {
        initialMap[s.id] = 'PRESENT';
      });
      setAttendanceMap(initialMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/attendance/my-attendance');
      setStudentData(res.data.data);
    } catch (err) {
      console.error('Failed to load student attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStudent) {
      fetchStudentData();
    } else {
      fetchFacultyData();
    }
  }, [isStudent]);

  // Faculty bulk marking actions
  const setStatus = (studentId: string, status: string) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const updated: { [key: string]: string } = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSubjectId || !selectedSectionId) {
      alert('Please select subject and section.');
      return;
    }

    try {
      const sessRes = await apiClient.post('/attendance/sessions', {
        subjectId: selectedSubjectId,
        sectionId: selectedSectionId,
        sessionDate,
        sessionTime,
        topicCovered: topicCovered || 'Regular Curriculum Lecture',
      });

      const lectureSessionId = sessRes.data.data.id;

      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      await apiClient.post('/attendance/mark', {
        lectureSessionId,
        records,
      });

      alert(`Session attendance successfully marked for ${records.length} students! Defaulter rosters updated.`);
      setTopicCovered('');
      fetchFacultyData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit attendance.');
    }
  };

  // -------------------------------------------------------------
  // RENDER 1: STUDENT VIEW (READ-ONLY PERSONAL ATTENDANCE)
  // -------------------------------------------------------------
  if (isStudent) {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading verified attendance ledger...</p>
        </div>
      );
    }

    const evaluation = studentData?.evaluation || {
      overallPercentage: 0,
      totalLectures: 0,
      totalAttended: 0,
      isOverallDefaulter: false,
      subjectSummaries: [],
    };
    const dailyLogs = studentData?.dailyLogs || [];

    const filteredLogs =
      studentSubjectFilter === 'ALL'
        ? dailyLogs
        : dailyLogs.filter((log: any) => log.subjectCode === studentSubjectFilter);

    return (
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">My Attendance &amp; Compliance</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                Read-Only Record
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Official lecture session records marked by course professors &bull; Students cannot modify attendance records
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Marked by Authorized Faculty Only</span>
          </div>
        </div>

        {/* Security Notification Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-700 space-y-1">
            <span className="font-bold text-slate-900 block">
              University Attendance Integrity Policy
            </span>
            <p>
              Your attendance is officially recorded in real time by subject professors during daily/monthly lecture sessions.
              Under academic statutory regulations, students have <strong>strictly read-only access</strong> and cannot edit, alter, or self-mark attendance.
            </p>
          </div>
        </div>

        {/* Statutory Attendance Gauge & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Overall Cumulative Attendance
            </span>
            <div className="my-3 flex items-baseline gap-2">
              <span
                className={`text-3xl font-black ${
                  evaluation.isOverallDefaulter ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {evaluation.overallPercentage}%
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({evaluation.totalAttended} / {evaluation.totalLectures} sessions)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${
                  evaluation.isOverallDefaulter ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(evaluation.overallPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Statutory Exam Eligibility
            </span>
            <div className="my-2">
              {evaluation.isOverallDefaulter ? (
                <div className="space-y-1">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                    Critical Defaulter (&lt; 75.0%)
                  </span>
                  <p className="text-[11px] text-rose-600 font-medium">
                    Risk of exam debarment. Meet your HOD immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                    Compliant (&ge; 75.0%)
                  </span>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Eligible for term-end university examinations.
                  </p>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400">SPPU / DTE Mandate: 75.0% Minimum</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Lectures Conducted
            </span>
            <div className="my-2">
              <span className="text-3xl font-black text-slate-900">{evaluation.totalLectures}</span>
              <span className="text-xs text-slate-500 block mt-0.5">Total class hours held</span>
            </div>
            <span className="text-[10px] text-slate-400">Across all registered subjects</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Academic Cohort
            </span>
            <div className="my-2 space-y-0.5 text-xs font-semibold text-slate-800">
              <div>{studentData?.student?.departmentCode || 'Branch'} &bull; Semester {studentData?.student?.semester || 1}</div>
              <div className="text-[11px] text-slate-500 font-normal">
                {studentData?.student?.section || 'Division A'}
              </div>
            </div>
            <span className="text-[10px] text-indigo-600 font-mono">
              Roll: {studentData?.student?.rollNumber}
            </span>
          </div>
        </div>

        {/* Subject-Wise Breakdown Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Subject-Wise Attendance Summary (Marked by Subject Professors)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Target: &ge; 75% per course
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Attended / Held</th>
                  <th className="py-3 px-4">Attendance %</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4">Required Classes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluation.subjectSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No subject attendance sessions recorded yet for current term.
                    </td>
                  </tr>
                ) : (
                  evaluation.subjectSummaries.map((sub: any) => (
                    <tr key={sub.subjectId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{sub.subjectName}</div>
                        <span className="font-mono text-[10px] text-slate-400">{sub.subjectCode}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {sub.attended} / {sub.totalConducted}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              sub.isDefaulter ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {sub.percentage}%
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                sub.isDefaulter ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.isDefaulter
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {sub.isDefaulter ? 'DEFAULTER RISK' : 'SATISFACTORY'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {sub.requiredClassesToReachThreshold > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            +{sub.requiredClassesToReachThreshold} more needed
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Safe margin</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily / Lecture-Wise Attendance Ledger (Strictly Read-Only) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Session-by-Session Attendance Ledger (Daily Audit Log)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Timestamped records marked by course faculty during lectures
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Filter Subject:</span>
              <select
                value={studentSubjectFilter}
                onChange={(e) => setStudentSubjectFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Subjects</option>
                {evaluation.subjectSummaries.map((sub: any) => (
                  <option key={sub.subjectCode} value={sub.subjectCode}>
                    {sub.subjectCode} - {sub.subjectName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Marked by (Professor)</th>
                  <th className="py-2.5 px-3">Topic Covered</th>
                  <th className="py-2.5 px-3">Recorded Status</th>
                  <th className="py-2.5 px-3">Student Modification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No lecture attendance records matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {new Date(log.date).toLocaleDateString([], {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{log.time}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        <div>{log.subjectName}</div>
                        <span className="font-mono text-[10px] text-slate-400">{log.subjectCode}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {log.facultyName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {log.topicCovered}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            log.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : log.status === 'ABSENT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          Locked
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: FACULTY & MANAGEMENT SUITE (ATTENDANCE MARKING & DEFAULTERS)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Professor / Faculty Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Professors record daily lecture sessions &bull; System auto-calculates SPPU &lt;75% statutory exam warnings
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('mark')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'mark' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Mark Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab('defaulters')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center ${
              activeTab === 'defaulters' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-500" />
            Defaulter Lists (&lt;75%)
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800">
              {defaulters.length}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading attendance system...</div>
      ) : activeTab === 'mark' ? (
        /* Single-click Bulk Marking Interface */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} ({sec.progName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Session Date</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
              <input
                type="text"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                placeholder="09:00 - 10:00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lecture Topic Covered
              </label>
              <input
                type="text"
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                placeholder="e.g. Dynamic Programming: Memoization vs Tabulation"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Quick Actions & Roster */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => markAll('PRESENT')}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAll('ABSENT')}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition"
              >
                Mark All Absent
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveAttendance}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Submit Session Attendance
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Status Selection (Faculty Marking)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const status = attendanceMap[student.id] || 'PRESENT';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                        {student.rollNumber}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-3 px-3">
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                          {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setStatus(student.id, opt)}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                                status === opt
                                  ? opt === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : opt === 'ABSENT'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-amber-500 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Defaulters List (<75%) */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-rose-500" />
                Statutory Attendance Defaulter Roster (&lt; 75.0%)
              </h3>
              <p className="text-xs text-slate-500">
                Students below the 75% attendance threshold are highlighted for exam debarment warnings
              </p>
            </div>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full border border-rose-200">
              {defaulters.length} Defaulters Identified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Attended / Total</th>
                  <th className="py-2.5 px-3">Attendance %</th>
                  <th className="py-2.5 px-3">Shortfall %</th>
                  <th className="py-2.5 px-3">Notice Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaulters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Great news! All enrolled students currently satisfy the 75% attendance criteria.
                    </td>
                  </tr>
                ) : (
                  defaulters.map((d: any) => (
                    <tr key={d.studentId} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3 font-mono font-bold text-rose-700">
                        {d.rollNumber}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{d.name}</td>
                      <td className="py-3 px-3 text-slate-600">{d.department}</td>
                      <td className="py-3 px-3 text-slate-700">
                        {d.totalAttended} / {d.totalLectures}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {d.overallPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-rose-500 font-bold">-{d.shortfallPercentage}%</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          CRITICAL WARNING ISSUED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
