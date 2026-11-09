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
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AttendancePage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mark' | 'defaulters'>('mark');

  // New session state
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('09:00 - 10:00');
  const [topicCovered, setTopicCovered] = useState('');

  // Bulk attendance state (studentId -> status)
  const [attendanceMap, setAttendanceMap] = useState<{ [studentId: string]: string }>({});

  const { user } = useAuth();
  const isFacultyOrAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const fetchData = async () => {
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

  useEffect(() => {
    fetchData();
  }, []);

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
      // 1. Create lecture session
      const sessRes = await apiClient.post('/attendance/sessions', {
        subjectId: selectedSubjectId,
        sectionId: selectedSectionId,
        sessionDate,
        sessionTime,
        topicCovered: topicCovered || 'Regular Curriculum Lecture',
      });

      const lectureSessionId = sessRes.data.data.id;

      // 2. Submit bulk records
      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      await apiClient.post('/attendance/mark', {
        lectureSessionId,
        records,
      });

      alert(`Attendance recorded for ${records.length} students! Defaulter lists updated.`);
      setTopicCovered('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit attendance.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Lecture session recording, single-click bulk attendance, and mandatory &lt;75% statutory alerts
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
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

            {isFacultyOrAdmin && (
              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Submit Session Attendance
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Status Selection</th>
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

