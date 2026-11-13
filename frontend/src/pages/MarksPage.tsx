import React, { useEffect, useState } from 'react';
import { Plus, Save, Award, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

const gradeColour = (grade: string) => {
  if (grade === 'O') return 'bg-purple-100 text-purple-700';
  if (grade === 'A+' || grade === 'A') return 'bg-blue-100 text-blue-700';
  if (grade === 'B+' || grade === 'B') return 'bg-emerald-100 text-emerald-700';
  if (grade === 'C') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

export const MarksPage: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isFaculty = role === 'FACULTY';
  const isStudent = role === 'STUDENT';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGEMENT';

  // Faculty / Admin state
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [examSchedules, setExamSchedules] = useState<any[]>([]);
  const [selectedExamScheduleId, setSelectedExamScheduleId] = useState('');
  const [marksMap, setMarksMap] = useState<Record<string, { internal: number; theory: number; practical: number; status: string }>>({});
  const [existingMarks, setExistingMarks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showStudents, setShowStudents] = useState(true);

  // Student view
  const [studentMarks, setStudentMarks] = useState<any[]>([]);

  // ----------------------------------------------------------------
  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      const [examRes, subRes, studRes] = await Promise.all([
        apiClient.get('/academics/exams').catch(() => ({ data: { data: [] } })),
        apiClient.get('/academics/subjects'),
        apiClient.get('/students'),
      ]);

      const examData = examRes.data.data ?? [];
      setExams(examData);
      setSubjects(subRes.data.data ?? []);
      setStudents(studRes.data.data ?? []);

      // Collect exam schedules from all exams
      const schedules: any[] = [];
      examData.forEach((ex: any) => {
        (ex.schedules ?? []).forEach((sch: any) => {
          schedules.push({ ...sch, examName: ex.name, examType: ex.examType, academicYear: ex.academicYear });
        });
      });
      setExamSchedules(schedules);

      if (schedules.length) setSelectedExamScheduleId(schedules[0].id);

      // Build initial marks map
      const initMap: typeof marksMap = {};
      (studRes.data.data ?? []).forEach((s: any) => {
        initMap[s.id] = { internal: 0, theory: 0, practical: 0, status: 'PASS' };
      });
      setMarksMap(initMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingMarks = async (scheduleId: string) => {
    if (!scheduleId) return;
    try {
      const res = await apiClient.get(`/marks/exam-schedule/${scheduleId}`);
      setExistingMarks(res.data.data ?? []);
      // Pre-fill form with existing values
      const updated = { ...marksMap };
      (res.data.data ?? []).forEach((m: any) => {
        if (updated[m.studentId]) {
          updated[m.studentId] = {
            internal: m.internalMarks,
            theory: m.theoryMarks,
            practical: m.practicalMarks,
            status: m.status,
          };
        }
      });
      setMarksMap(updated);
    } catch {
      // 403 means faculty hasn't entered any yet — that's fine
      setExistingMarks([]);
    }
  };

  const fetchStudentMarks = async () => {
    setLoading(true);
    try {
      const studentId = user?.studentProfile?.id;
      if (!studentId) return;
      const res = await apiClient.get(`/marks/student/${studentId}`);
      setStudentMarks(res.data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStudent) {
      fetchStudentMarks();
    } else {
      fetchFacultyData();
    }
  }, [isStudent]);

  useEffect(() => {
    if (selectedExamScheduleId) fetchExistingMarks(selectedExamScheduleId);
  }, [selectedExamScheduleId]);

  // ----------------------------------------------------------------
  const setMark = (studentId: string, field: 'internal' | 'theory' | 'practical', value: number) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: Math.max(0, Math.min(100, value)) },
    }));
  };

  const setStatus = (studentId: string, status: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleSave = async () => {
    if (!selectedExamScheduleId) {
      alert('Please select an exam schedule first.');
      return;
    }
    setSaving(true);
    try {
      const entries = students.map((s) => {
        const m = marksMap[s.id] ?? { internal: 0, theory: 0, practical: 0, status: 'PASS' };
        return {
          examScheduleId: selectedExamScheduleId,
          studentId: s.id,
          internalMarks: m.internal,
          theoryMarks: m.theory,
          practicalMarks: m.practical,
          status: m.status,
        };
      });

      await apiClient.post('/marks/bulk', { entries });
      alert(`Marks saved for ${entries.length} students.`);
      fetchExistingMarks(selectedExamScheduleId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------------
  // STUDENT VIEW — read-only marks
  if (isStudent) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-5 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">My Marks</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Academic results entered by faculty — read only
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5" /> Read-Only
          </span>
        </div>

        {studentMarks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No marks entered yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Marks will appear here once faculty submits results.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">
                Results ({studentMarks.length} entries)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Exam</th>
                    <th className="py-2.5 px-4">Internal</th>
                    <th className="py-2.5 px-4">Theory</th>
                    <th className="py-2.5 px-4">Practical</th>
                    <th className="py-2.5 px-4">Total</th>
                    <th className="py-2.5 px-4">%</th>
                    <th className="py-2.5 px-4">Grade</th>
                    <th className="py-2.5 px-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentMarks.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-slate-800">
                          {m.examSchedule.subject.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {m.examSchedule.subject.code}
                        </p>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {m.examSchedule.exam.name}
                        <p className="text-[10px] text-slate-400">{m.examSchedule.exam.examType}</p>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{m.internalMarks}</td>
                      <td className="py-2.5 px-4 text-slate-600">{m.theoryMarks}</td>
                      <td className="py-2.5 px-4 text-slate-600">{m.practicalMarks}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{m.totalMarks}</td>
                      <td className="py-2.5 px-4 text-slate-700">{m.percentage}%</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gradeColour(m.letterGrade)}`}>
                          {m.letterGrade}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.status === 'PASS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : m.status === 'ABSENT'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------
  // FACULTY / ADMIN VIEW — marks entry
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Marks Entry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter and update student marks per exam schedule
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedExamScheduleId}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Marks'}
        </button>
      </div>

      {/* Exam schedule selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-800 mb-3">Select Exam Schedule</p>
        {examSchedules.length === 0 ? (
          <p className="text-xs text-slate-400">
            No exam schedules found. Create an exam and schedule in Academics first.
          </p>
        ) : (
          <select
            className={inputCls + ' max-w-md'}
            value={selectedExamScheduleId}
            onChange={(e) => setSelectedExamScheduleId(e.target.value)}
          >
            {examSchedules.map((sch) => (
              <option key={sch.id} value={sch.id}>
                {sch.examName} — {sch.subject?.name ?? 'Subject'} ({sch.examType})
              </option>
            ))}
          </select>
        )}

        {existingMarks.length > 0 && (
          <p className="text-[11px] text-emerald-600 mt-2">
            ✓ {existingMarks.length} mark entries already recorded for this schedule.
          </p>
        )}
      </div>

      {/* Students marks table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          className="w-full px-5 py-3 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition"
          onClick={() => setShowStudents(!showStudents)}
        >
          <p className="text-sm font-semibold text-slate-800">
            Students ({students.length})
          </p>
          {showStudents ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showStudents && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Roll No.</th>
                  <th className="py-2.5 px-4">Dept.</th>
                  <th className="py-2.5 px-4 w-24">Internal</th>
                  <th className="py-2.5 px-4 w-24">Theory</th>
                  <th className="py-2.5 px-4 w-24">Practical</th>
                  <th className="py-2.5 px-4">Total</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s: any) => {
                  const m = marksMap[s.id] ?? { internal: 0, theory: 0, practical: 0, status: 'PASS' };
                  const total = m.internal + m.theory + m.practical;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-medium text-slate-800">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="py-2 px-4 font-mono text-slate-600">{s.rollNumber}</td>
                      <td className="py-2 px-4">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                          {s.department?.code}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                          value={m.internal}
                          onChange={(e) => setMark(s.id, 'internal', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                          value={m.theory}
                          onChange={(e) => setMark(s.id, 'theory', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                          value={m.practical}
                          onChange={(e) => setMark(s.id, 'practical', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 px-4 font-bold text-slate-800">{total}</td>
                      <td className="py-2 px-4">
                        <select
                          className="border border-slate-200 rounded px-2 py-1 text-xs"
                          value={m.status}
                          onChange={(e) => setStatus(s.id, e.target.value)}
                        >
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                          <option value="ABSENT">ABSENT</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || !selectedExamScheduleId}
                className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save All Marks'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
