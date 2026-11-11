import React, { useEffect, useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AcademicsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subjects' | 'exams' | 'grading'>('subjects');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subDeptId, setSubDeptId] = useState('');
  const [subSemester, setSubSemester] = useState(3);
  const [subCredits, setSubCredits] = useState(4);
  const [subType, setSubType] = useState<'THEORY' | 'PRACTICAL' | 'ELECTIVE'>('THEORY');
  const [subInternal, setSubInternal] = useState(30);
  const [subExternal, setSubExternal] = useState(70);
  const [subSyllabus, setSubSyllabus] = useState('');

  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState<'MID_TERM' | 'FINAL' | 'INTERNAL' | 'PRACTICAL'>('FINAL');
  const [examSemester, setExamSemester] = useState(3);
  const [examYear, setExamYear] = useState('2024-25');
  const [examStart, setExamStart] = useState('2024-12-01');
  const [examEnd, setExamEnd] = useState('2024-12-15');

  const [schedExamId, setSchedExamId] = useState('');
  const [schedSubId, setSchedSubId] = useState('');
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedStart, setSchedStart] = useState('10:00');
  const [schedEnd, setSchedEnd] = useState('13:00');
  const [schedRoom, setSchedRoom] = useState('Exam Hall 101');
  const [schedMaxMarks, setSchedMaxMarks] = useState(100);

  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [marks, setMarks] = useState<{ [studentId: string]: { internal: number; theory: number } }>({});
  const [publishSemester, setPublishSemester] = useState(3);

  const { user } = useAuth();
  const canGrade = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT' || user?.role === 'FACULTY';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, examsRes, studentsRes, deptsRes] = await Promise.all([
        apiClient.get('/academics/subjects'), apiClient.get('/academics/exams'),
        apiClient.get('/students'), apiClient.get('/departments'),
      ]);
      setSubjects(subsRes.data.data); setExams(examsRes.data.data);
      setStudents(studentsRes.data.data); setDepartments(deptsRes.data.data);
      if (deptsRes.data.data.length > 0) setSubDeptId(deptsRes.data.data[0].id);
      if (subsRes.data.data.length > 0) setSchedSubId(subsRes.data.data[0].id);
      if (examsRes.data.data.length > 0) {
        setSchedExamId(examsRes.data.data[0].id);
        if (examsRes.data.data[0].schedules?.length > 0) setSelectedScheduleId(examsRes.data.data[0].schedules[0].id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academics/subjects', { code: subCode.toUpperCase(), name: subName, departmentId: subDeptId, semester: Number(subSemester), credits: Number(subCredits), type: subType, maxInternalMarks: Number(subInternal), maxExternalMarks: Number(subExternal), totalMarks: Number(subInternal) + Number(subExternal), syllabusOverview: subSyllabus });
      setShowSubjectModal(false); setSubCode(''); setSubName(''); setSubSyllabus('');
      fetchData(); alert('Subject created!');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academics/exams', { name: examName, examType, semester: Number(examSemester), academicYear: examYear, startDate: new Date(examStart).toISOString(), endDate: new Date(examEnd).toISOString() });
      setShowExamModal(false); setExamName(''); fetchData(); alert('Exam cycle created!');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academics/exam-schedules', { examId: schedExamId, subjectId: schedSubId, examDate: new Date(schedDate).toISOString(), startTime: schedStart, endTime: schedEnd, roomNumber: schedRoom, maxMarks: Number(schedMaxMarks) });
      setShowScheduleModal(false); fetchData(); alert('Schedule added!');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const handleMarkChange = (studentId: string, field: 'internal' | 'theory', value: number) => {
    setMarks((prev) => ({ ...prev, [studentId]: { internal: field === 'internal' ? value : prev[studentId]?.internal || 0, theory: field === 'theory' ? value : prev[studentId]?.theory || 0 } }));
  };

  const handleSaveMarks = async () => {
    if (!selectedScheduleId) { alert('Select a schedule.'); return; }
    const entries = Object.entries(marks).map(([studentId, data]) => ({ studentId, internalMarks: Number(data.internal || 0), theoryMarks: Number(data.theory || 0) }));
    if (entries.length === 0) { alert('Enter marks for at least one student.'); return; }
    try {
      const res = await apiClient.post('/academics/marks', { examScheduleId: selectedScheduleId, entries });
      alert(res.data.message || 'Marks saved!'); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const handlePublishResults = async () => {
    if (!confirm(`Publish results for Semester ${publishSemester}?`)) return;
    try {
      const res = await apiClient.post('/academics/publish-results', { semester: Number(publishSemester) });
      alert(res.data.message || 'Results published!');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';
  const btnPrimary = 'px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition';
  const btnSecondary = 'px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition';

  const tabs = [
    { key: 'subjects', label: 'Subjects' },
    { key: 'exams', label: 'Exam Cycles' },
    ...(canGrade ? [{ key: 'grading', label: 'Marks & Grading' }] : []),
  ] as { key: 'subjects' | 'exams' | 'grading'; label: string }[];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Academics & Examinations</h1>
          <p className="text-xs text-slate-500 mt-0.5">Subjects, exam schedules and automated grading</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && activeTab === 'subjects' && (
            <button onClick={() => setShowSubjectModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"><Plus className="w-3.5 h-3.5" />Add Subject</button>
          )}
          {isAdmin && activeTab === 'exams' && (
            <>
              <button onClick={() => setShowExamModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"><Plus className="w-3.5 h-3.5" />Exam Cycle</button>
              <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"><Plus className="w-3.5 h-3.5" />Schedule</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 text-xs font-medium border-b-2 transition -mb-px ${activeTab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>
      ) : activeTab === 'subjects' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub) => (
            <div key={sub.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{sub.code}</span>
                <span className="text-[10px] text-slate-500">{sub.credits} credits</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{sub.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{sub.department?.name} · Sem {sub.semester}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between"><span>Internal</span><span className="font-medium">{sub.maxInternalMarks} marks</span></div>
                <div className="flex justify-between"><span>External</span><span className="font-medium">{sub.maxExternalMarks} marks</span></div>
                <div className="flex justify-between font-semibold text-slate-800 pt-1 border-t border-slate-100"><span>Total</span><span>{sub.totalMarks} marks</span></div>
              </div>
              {sub.syllabusOverview && <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{sub.syllabusOverview}</p>}
            </div>
          ))}
        </div>
      ) : activeTab === 'exams' ? (
        <div className="space-y-5">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{exam.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{exam.academicYear} · Sem {exam.semester} · {exam.examType}</p>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                      <th className="py-2.5 px-4">Subject</th><th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Time</th><th className="py-2.5 px-4">Room</th>
                      <th className="py-2.5 px-4">Max Marks</th><th className="py-2.5 px-4">Graded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exam.schedules?.map((sch: any) => (
                      <tr key={sch.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{sch.subject?.code} — {sch.subject?.name}</td>
                        <td className="py-2.5 px-4 text-slate-600">{new Date(sch.examDate).toLocaleDateString()}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{sch.startTime} - {sch.endTime}</td>
                        <td className="py-2.5 px-4 text-slate-600">{sch.roomNumber}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{sch.maxMarks}</td>
                        <td className="py-2.5 px-4"><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{sch._count?.marks || 0}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Marks Entry</h3>
              <p className="text-xs text-slate-500">Select a scheduled exam paper to enter scores</p>
            </div>
            <div className="flex items-center gap-2">
              <select className={`${inputCls} max-w-xs`} value={selectedScheduleId} onChange={(e) => setSelectedScheduleId(e.target.value)}>
                {exams.flatMap((ex) => (ex.schedules || []).map((sch: any) => (
                  <option key={sch.id} value={sch.id}>{ex.name}: {sch.subject?.code} ({new Date(sch.examDate).toLocaleDateString()})</option>
                )))}
              </select>
              <button onClick={handleSaveMarks} className={btnPrimary}>Save Marks</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Roll No.</th><th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Internal (max 30)</th><th className="py-2.5 px-4">Theory (max 70)</th><th className="py-2.5 px-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const currInternal = marks[student.id]?.internal ?? 0;
                  const currTheory = marks[student.id]?.theory ?? 0;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-slate-600">{student.rollNumber}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{student.firstName} {student.lastName}</td>
                      <td className="py-2.5 px-4"><input type="number" min={0} max={30} value={currInternal} onChange={(e) => handleMarkChange(student.id, 'internal', Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-center" /></td>
                      <td className="py-2.5 px-4"><input type="number" min={0} max={70} value={currTheory} onChange={(e) => handleMarkChange(student.id, 'theory', Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-center" /></td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{currInternal + currTheory}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isAdmin && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
              <span className="text-xs text-slate-600">Publish results for Semester:</span>
              <input type="number" min={1} max={8} value={publishSemester} onChange={(e) => setPublishSemester(Number(e.target.value))} className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center" />
              <button onClick={handlePublishResults} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"><Send className="w-3.5 h-3.5" />Publish Results</button>
            </div>
          )}
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Add Subject</h3>
            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Code</label><input className={inputCls} required value={subCode} onChange={(e) => setSubCode(e.target.value)} placeholder="CS301" /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Credits</label><input type="number" className={inputCls} min={1} value={subCredits} onChange={(e) => setSubCredits(Number(e.target.value))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Name</label><input className={inputCls} required value={subName} onChange={(e) => setSubName(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Department</label><select className={inputCls} value={subDeptId} onChange={(e) => setSubDeptId(e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}</select></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Semester</label><input type="number" className={inputCls} min={1} max={8} value={subSemester} onChange={(e) => setSubSemester(Number(e.target.value))} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Internal</label><input type="number" className={inputCls} value={subInternal} onChange={(e) => setSubInternal(Number(e.target.value))} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">External</label><input type="number" className={inputCls} value={subExternal} onChange={(e) => setSubExternal(Number(e.target.value))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Type</label><select className={inputCls} value={subType} onChange={(e) => setSubType(e.target.value as any)}><option value="THEORY">Theory</option><option value="PRACTICAL">Practical</option><option value="ELECTIVE">Elective</option></select></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Syllabus Overview</label><textarea className={inputCls} rows={2} value={subSyllabus} onChange={(e) => setSubSyllabus(e.target.value)} /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowSubjectModal(false)} className={btnSecondary}>Cancel</button><button type="submit" className={btnPrimary}>Save</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Exam Modal */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Create Exam Cycle</h3>
            <form onSubmit={handleCreateExam} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Name</label><input className={inputCls} required value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Mid-Term 2024" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Type</label><select className={inputCls} value={examType} onChange={(e) => setExamType(e.target.value as any)}><option value="FINAL">Final</option><option value="MID_TERM">Mid Term</option><option value="INTERNAL">Internal</option><option value="PRACTICAL">Practical</option></select></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Semester</label><input type="number" className={inputCls} min={1} max={8} value={examSemester} onChange={(e) => setExamSemester(Number(e.target.value))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Academic Year</label><input className={inputCls} value={examYear} onChange={(e) => setExamYear(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label><input type="date" className={inputCls} value={examStart} onChange={(e) => setExamStart(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">End Date</label><input type="date" className={inputCls} value={examEnd} onChange={(e) => setExamEnd(e.target.value)} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowExamModal(false)} className={btnSecondary}>Cancel</button><button type="submit" className={btnPrimary}>Save</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Schedule Exam Paper</h3>
            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Exam Cycle</label><select className={inputCls} value={schedExamId} onChange={(e) => setSchedExamId(e.target.value)}>{exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Subject</label><select className={inputCls} value={schedSubId} onChange={(e) => setSchedSubId(e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Date</label><input type="date" className={inputCls} value={schedDate} onChange={(e) => setSchedDate(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label><input className={inputCls} value={schedStart} onChange={(e) => setSchedStart(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">End Time</label><input className={inputCls} value={schedEnd} onChange={(e) => setSchedEnd(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Room</label><input className={inputCls} value={schedRoom} onChange={(e) => setSchedRoom(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Max Marks</label><input type="number" className={inputCls} value={schedMaxMarks} onChange={(e) => setSchedMaxMarks(Number(e.target.value))} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowScheduleModal(false)} className={btnSecondary}>Cancel</button><button type="submit" className={btnPrimary}>Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
