import React, { useEffect, useState } from 'react';
import { BookOpen, Award, CheckCircle2, Calendar, FileText, Send, Plus, Clock, MapPin, Hash } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AcademicsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subjects' | 'exams' | 'grading'>('subjects');

  // Modal visibility
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form state: Subject
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subDeptId, setSubDeptId] = useState('');
  const [subSemester, setSubSemester] = useState(3);
  const [subCredits, setSubCredits] = useState(4);
  const [subType, setSubType] = useState<'THEORY' | 'PRACTICAL' | 'ELECTIVE'>('THEORY');
  const [subInternal, setSubInternal] = useState(30);
  const [subExternal, setSubExternal] = useState(70);
  const [subSyllabus, setSubSyllabus] = useState('');

  // Form state: Exam Cycle
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState<'MID_TERM' | 'FINAL' | 'INTERNAL' | 'PRACTICAL'>('FINAL');
  const [examSemester, setExamSemester] = useState(3);
  const [examYear, setExamYear] = useState('2024-25');
  const [examStart, setExamStart] = useState('2024-12-01');
  const [examEnd, setExamEnd] = useState('2024-12-15');

  // Form state: Exam Schedule
  const [schedExamId, setSchedExamId] = useState('');
  const [schedSubId, setSchedSubId] = useState('');
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedStart, setSchedStart] = useState('10:00');
  const [schedEnd, setSchedEnd] = useState('13:00');
  const [schedRoom, setSchedRoom] = useState('Exam Hall 101');
  const [schedMaxMarks, setSchedMaxMarks] = useState(100);

  // Grading state
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<{ [studentId: string]: { internal: number; theory: number } }>({});
  const [publishSemester, setPublishSemester] = useState(3);

  const { user } = useAuth();
  const canGrade =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT' || user?.role === 'FACULTY';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, examsRes, studentsRes, deptsRes] = await Promise.all([
        apiClient.get('/academics/subjects'),
        apiClient.get('/academics/exams'),
        apiClient.get('/students'),
        apiClient.get('/departments'),
      ]);
      setSubjects(subsRes.data.data);
      setExams(examsRes.data.data);
      setStudents(studentsRes.data.data);
      setDepartments(deptsRes.data.data);

      if (deptsRes.data.data.length > 0) setSubDeptId(deptsRes.data.data[0].id);
      if (subsRes.data.data.length > 0) setSchedSubId(subsRes.data.data[0].id);

      if (examsRes.data.data.length > 0) {
        setSchedExamId(examsRes.data.data[0].id);
        if (examsRes.data.data[0].schedules?.length > 0) {
          setSelectedScheduleId(examsRes.data.data[0].schedules[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academics/subjects', {
        code: subCode.toUpperCase(),
        name: subName,
        departmentId: subDeptId,
        semester: Number(subSemester),
        credits: Number(subCredits),
        type: subType,
        maxInternalMarks: Number(subInternal),
        maxExternalMarks: Number(subExternal),
        totalMarks: Number(subInternal) + Number(subExternal),
        syllabusOverview: subSyllabus,
      });
      setShowSubjectModal(false);
      setSubCode('');
      setSubName('');
      setSubSyllabus('');
      fetchData();
      alert('Subject created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create subject.');
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academics/exams', {
        name: examName,
        examType,
        semester: Number(examSemester),
        academicYear: examYear,
        startDate: new Date(examStart).toISOString(),
        endDate: new Date(examEnd).toISOString(),
      });
      setShowExamModal(false);
      setExamName('');
      fetchData();
      alert('Examination cycle created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create exam.');
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academics/exam-schedules', {
        examId: schedExamId,
        subjectId: schedSubId,
        examDate: new Date(schedDate).toISOString(),
        startTime: schedStart,
        endTime: schedEnd,
        roomNumber: schedRoom,
        maxMarks: Number(schedMaxMarks),
      });
      setShowScheduleModal(false);
      fetchData();
      alert('Exam schedule added successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule exam.');
    }
  };

  const handleMarkChange = (studentId: string, field: 'internal' | 'theory', value: number) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        internal: field === 'internal' ? value : prev[studentId]?.internal || 0,
        theory: field === 'theory' ? value : prev[studentId]?.theory || 0,
      },
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedScheduleId) {
      alert('Please select an exam schedule.');
      return;
    }

    const entries = Object.entries(marks).map(([studentId, data]) => ({
      studentId,
      internalMarks: Number(data.internal || 0),
      theoryMarks: Number(data.theory || 0),
    }));

    if (entries.length === 0) {
      alert('Please input marks for at least one student.');
      return;
    }

    try {
      const res = await apiClient.post('/academics/marks', {
        examScheduleId: selectedScheduleId,
        entries,
      });
      alert(res.data.message || 'Marks saved and grades computed!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit marks.');
    }
  };

  const handlePublishResults = async () => {
    if (!confirm(`Are you sure you want to publish final results and calculate SGPA/CGPA for Semester ${publishSemester}?`)) {
      return;
    }

    try {
      const res = await apiClient.post('/academics/publish-results', {
        semester: Number(publishSemester),
      });
      alert(res.data.message || 'Results published successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Publishing failed.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academics &amp; Examinations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Curriculum syllabi, credit weighting, examination schedules, and automated grading
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action buttons for Management & SuperAdmin */}
          {isAdmin && activeTab === 'subjects' && (
            <button
              onClick={() => setShowSubjectModal(true)}
              className="px-3.5 py-1.5 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          )}

          {isAdmin && activeTab === 'exams' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExamModal(true)}
                className="px-3.5 py-1.5 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Exam Cycle</span>
              </button>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Paper</span>
              </button>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'subjects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Subjects &amp; Credits
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'exams' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Exam Cycles
            </button>
            {canGrade && (
              <button
                onClick={() => setActiveTab('grading')}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  activeTab === 'grading' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Marks Entry &amp; Grading
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading academic data...</div>
      ) : activeTab === 'subjects' ? (
        /* Subjects & Syllabi */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {sub.code}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {sub.credits} Credits
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">{sub.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {sub.department?.name} • Semester {sub.semester}
                </p>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Internal Assessment:</span>
                    <span className="font-semibold">{sub.maxInternalMarks} marks</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Theory Examination:</span>
                    <span className="font-semibold">{sub.maxExternalMarks} marks</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                    <span>Total Marks:</span>
                    <span>{sub.totalMarks} marks</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                  {sub.syllabusOverview || 'Comprehensive university curriculum syllabus.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'exams' ? (
        /* Exam Cycles & Schedules */
        <div className="space-y-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{exam.name}</h3>
                  <p className="text-xs text-slate-500">
                    Session {exam.academicYear} • Semester {exam.semester} • Type: {exam.examType}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 self-start">
                  Active Cycle
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Timing</th>
                      <th className="py-2.5 px-3">Examination Hall</th>
                      <th className="py-2.5 px-3">Max Marks</th>
                      <th className="py-2.5 px-3">Graded Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exam.schedules?.map((sch: any) => (
                      <tr key={sch.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {sch.subject?.code} - {sch.subject?.name}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(sch.examDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-mono text-indigo-600">
                          {sch.startTime} - {sch.endTime}
                        </td>
                        <td className="py-3 px-3 text-slate-700">{sch.roomNumber}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{sch.maxMarks}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {sch._count?.marks || 0} students
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Marks Entry & Automated Grading */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Evaluation &amp; Scorecard Registry</h3>
              <p className="text-xs text-slate-500">Select active scheduled paper to enter examination scores</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                {exams.flatMap((ex) =>
                  (ex.schedules || []).map((sch: any) => (
                    <option key={sch.id} value={sch.id}>
                      {ex.name}: {sch.subject?.code} ({new Date(sch.examDate).toLocaleDateString()})
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={handleSaveMarks}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Save Marks
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Internal (Max 30)</th>
                  <th className="py-2.5 px-3">Theory / End-Sem (Max 70)</th>
                  <th className="py-2.5 px-3">Total Evaluated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const currInternal = marks[student.id]?.internal ?? 0;
                  const currTheory = marks[student.id]?.theory ?? 0;
                  const total = currInternal + currTheory;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600">{student.rollNumber}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={currInternal}
                          onChange={(e) => handleMarkChange(student.id, 'internal', Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min={0}
                          max={70}
                          value={currTheory}
                          onChange={(e) => handleMarkChange(student.id, 'theory', Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800">{total} / 100</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Admin Result Publication Section */}
          {isAdmin && (
            <div className="pt-6 border-t border-slate-200 flex items-center justify-between bg-slate-50 p-4 rounded-xl">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Publish Semester Grade Cards</h4>
                <p className="text-[11px] text-slate-500">
                  Computes final weighted SGPA, cumulative CGPA, and publishes transcripts
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={publishSemester}
                  onChange={(e) => setPublishSemester(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                  <option value={3}>Semester 3</option>
                  <option value={4}>Semester 4</option>
                </select>
                <button
                  onClick={handlePublishResults}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Publish Results &amp; Compute CGPA
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Add Subject */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Academic Course / Subject</h3>
            <p className="text-xs text-slate-500 mb-4">Register subject under an engineering curriculum</p>
            <form onSubmit={handleCreateSubject} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                    placeholder="CS301"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="THEORY">Theory</option>
                    <option value="PRACTICAL">Practical / Lab</option>
                    <option value="ELECTIVE">Elective</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Data Structures & Algorithms"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={subDeptId}
                  onChange={(e) => setSubDeptId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={subSemester}
                    onChange={(e) => setSubSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={subCredits}
                    onChange={(e) => setSubCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Internal</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={subInternal}
                    onChange={(e) => setSubInternal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Theory/External</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={subExternal}
                    onChange={(e) => setSubExternal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Syllabus Overview</label>
                <textarea
                  rows={2}
                  value={subSyllabus}
                  onChange={(e) => setSubSyllabus(e.target.value)}
                  placeholder="Key topics, modules, prerequisites..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Exam Cycle */}
      {showExamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Examination Cycle</h3>
            <p className="text-xs text-slate-500 mb-4">Schedule a new university or in-semester test session</p>
            <form onSubmit={handleCreateExam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Cycle Title</label>
                <input
                  type="text"
                  required
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="SPPU In-Sem Examination Oct 2024"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Type</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="MID_TERM">In-Sem / Mid-Term</option>
                    <option value="FINAL">University End-Sem</option>
                    <option value="INTERNAL">Internal Assessment</option>
                    <option value="PRACTICAL">Practical / Oral Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={examSemester}
                    onChange={(e) => setExamSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  required
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  placeholder="2024-25"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={examStart}
                    onChange={(e) => setExamStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={examEnd}
                    onChange={(e) => setExamEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold"
                >
                  Save Exam Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Schedule Exam Paper */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Schedule Examination Paper</h3>
            <p className="text-xs text-slate-500 mb-4">Set time, date, and hall for a subject paper</p>
            <form onSubmit={handleCreateSchedule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Cycle</label>
                <select
                  value={schedExamId}
                  onChange={(e) => setSchedExamId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} (Sem {ex.semester}, {ex.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={schedSubId}
                  onChange={(e) => setSchedSubId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name} (Sem {sub.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paper Date</label>
                  <input
                    type="date"
                    required
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Marks</label>
                  <input
                    type="number"
                    required
                    value={schedMaxMarks}
                    onChange={(e) => setSchedMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={schedStart}
                    onChange={(e) => setSchedStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={schedEnd}
                    onChange={(e) => setSchedEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Examination Hall</label>
                <input
                  type="text"
                  required
                  value={schedRoom}
                  onChange={(e) => setSchedRoom(e.target.value)}
                  placeholder="Exam Hall 101 / Drawing Hall"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
