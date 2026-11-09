import React, { useEffect, useState } from 'react';
import { BookOpen, Award, CheckCircle2, Calendar, FileText, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AcademicsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subjects' | 'exams' | 'grading'>('subjects');

  // Grading state
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<{ [studentId: string]: { internal: number; theory: number } }>({});
  const [publishSemester, setPublishSemester] = useState(3);

  const { user } = useAuth();
  const canGrade = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'FACULTY';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, examsRes, studentsRes] = await Promise.all([
        apiClient.get('/academics/subjects'),
        apiClient.get('/academics/exams'),
        apiClient.get('/students'),
      ]);
      setSubjects(subsRes.data.data);
      setExams(examsRes.data.data);
      setStudents(studentsRes.data.data);

      if (examsRes.data.data[0]?.schedules?.length > 0) {
        setSelectedScheduleId(examsRes.data.data[0].schedules[0].id);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academics &amp; Examinations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Curriculum syllabi, credit weighting, examination schedules, and automated grading
          </p>
        </div>

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
                          {sch.subject.code} - {sch.subject.name}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Subject Marks Entry &amp; Grading</h3>
              <p className="text-xs text-slate-500">
                Input internal and theory marks. Letter grades (O, A+, A...) and 10-point GPA scale compute automatically.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
              >
                {exams.flatMap((e) =>
                  e.schedules.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.subject.code} - {s.subject.name} ({new Date(s.examDate).toLocaleDateString()})
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={handleSaveMarks}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Submit &amp; Grade Marks
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
                  <th className="py-2.5 px-3">Theory (Max 70)</th>
                  <th className="py-2.5 px-3">Live Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const currInternal = marks[student.id]?.internal ?? 25;
                  const currTheory = marks[student.id]?.theory ?? 60;
                  const total = currInternal + currTheory;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                        {student.rollNumber}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          defaultValue={currInternal}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'internal', Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min={0}
                          max={70}
                          defaultValue={currTheory}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'theory', Number(e.target.value))
                          }
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
    </div>
  );
};
