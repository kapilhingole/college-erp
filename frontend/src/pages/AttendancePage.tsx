import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isFacultyOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT' || user?.role === 'FACULTY';

  // Faculty state
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'mark' | 'defaulters'>('mark');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('09:00 - 10:00');
  const [topicCovered, setTopicCovered] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<{ [studentId: string]: string }>({});

  // Student state
  const [studentData, setStudentData] = useState<any | null>(null);
  const [studentSubjectFilter, setStudentSubjectFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      const [subsRes, deptsRes, defRes] = await Promise.all([
        apiClient.get('/academics/subjects'),
        apiClient.get('/departments'),
        apiClient.get('/attendance/defaulters'),
      ]);
      setSubjects(subsRes.data.data);
      setDefaulters(defRes.data.data);

      const allSecs: any[] = [];
      deptsRes.data.data.forEach((d: any) =>
        d.programs?.forEach((p: any) =>
          p.batches?.forEach((b: any) =>
            b.sections?.forEach((s: any) =>
              allSecs.push({
                ...s,
                progName: p.name,
                deptCode: d.code,
                deptName: d.name,
                batchName: b.name,
              })
            )
          )
        )
      );
      setSections(allSecs);

      const initialSecId = allSecs[0]?.id || '';
      setSelectedSectionId(initialSecId);
      if (subsRes.data.data.length > 0) setSelectedSubjectId(subsRes.data.data[0].id);

      if (initialSecId) {
        await loadStudentsForSection(initialSecId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForSection = async (sectionId: string) => {
    if (!sectionId) return;
    try {
      const res = await apiClient.get(`/students?sectionId=${sectionId}&limit=200`);
      const studentList = res.data.data;
      setStudents(studentList);
      const initialMap: { [key: string]: string } = {};
      studentList.forEach((s: any) => {
        initialMap[s.id] = 'PRESENT';
      });
      setAttendanceMap(initialMap);
    } catch (err) {
      console.error(err);
    }
  };

  const onSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    loadStudentsForSection(sectionId);
  };

  const fetchStudentData = async () => {
    setLoading(true);
    try { const res = await apiClient.get('/attendance/my-attendance'); setStudentData(res.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { isStudent ? fetchStudentData() : fetchFacultyData(); }, [isStudent]);

  const setStatus = (studentId: string, status: string) => setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  const markAll = (status: 'PRESENT' | 'ABSENT') => { const u: { [k: string]: string } = {}; students.forEach((s) => { u[s.id] = status; }); setAttendanceMap(u); };

  const handleSaveAttendance = async () => {
    if (!selectedSubjectId || !selectedSectionId) { alert('Select subject and section.'); return; }
    try {
      const sessRes = await apiClient.post('/attendance/sessions', { subjectId: selectedSubjectId, sectionId: selectedSectionId, sessionDate, sessionTime, topicCovered: topicCovered || 'Regular Lecture' });
      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({ studentId, status }));
      await apiClient.post('/attendance/mark', { lectureSessionId: sessRes.data.data.id, records });
      alert(`Attendance marked for ${records.length} students.`);
      setTopicCovered(''); fetchFacultyData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

  // --- STUDENT VIEW ---
  if (isStudent) {
    if (loading) return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /></div>;

    const evaluation = studentData?.evaluation || { overallPercentage: 0, totalLectures: 0, totalAttended: 0, isOverallDefaulter: false, subjectSummaries: [] };
    const dailyLogs = studentData?.dailyLogs || [];
    const filteredLogs = studentSubjectFilter === 'ALL' ? dailyLogs : dailyLogs.filter((log: any) => log.subjectCode === studentSubjectFilter);

    return (
      <div className="space-y-5 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">My Attendance</h1>
            <p className="text-xs text-slate-500 mt-0.5">Official records marked by faculty — read only</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5" /> Read-Only
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Overall</p>
            <p className={`text-2xl font-bold ${evaluation.isOverallDefaulter ? 'text-red-600' : 'text-emerald-600'}`}>{evaluation.overallPercentage}%</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className={`h-1.5 rounded-full ${evaluation.isOverallDefaulter ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(evaluation.overallPercentage, 100)}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{evaluation.totalAttended}/{evaluation.totalLectures} sessions</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Exam Eligibility</p>
            <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${evaluation.isOverallDefaulter ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {evaluation.isOverallDefaulter ? 'AT RISK' : 'ELIGIBLE'}
            </span>
            <p className="text-[11px] text-slate-400 mt-1.5">SPPU threshold: 75%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Lectures Held</p>
            <p className="text-2xl font-bold text-slate-900">{evaluation.totalLectures}</p>
            <p className="text-[11px] text-slate-400 mt-1">All subjects</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Branch & Sem</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{studentData?.student?.departmentCode || '—'} · Sem {studentData?.student?.semester || 1}</p>
            <p className="text-[11px] font-mono text-slate-400 mt-1">Roll: {studentData?.student?.rollNumber}</p>
          </div>
        </div>

        {/* Subject-wise table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Subject-Wise Summary</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Subject</th><th className="py-2.5 px-4">Attended/Held</th>
                  <th className="py-2.5 px-4">Percentage</th><th className="py-2.5 px-4">Status</th><th className="py-2.5 px-4">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluation.subjectSummaries.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No records yet.</td></tr>
                ) : evaluation.subjectSummaries.map((sub: any) => (
                  <tr key={sub.subjectId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4"><p className="font-medium text-slate-800">{sub.subjectName}</p><span className="text-[10px] font-mono text-slate-400">{sub.subjectCode}</span></td>
                    <td className="py-2.5 px-4 text-slate-600">{sub.attended}/{sub.totalConducted}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${sub.isDefaulter ? 'text-red-600' : 'text-emerald-600'}`}>{sub.percentage}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${sub.isDefaulter ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(sub.percentage, 100)}%` }} /></div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.isDefaulter ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{sub.isDefaulter ? 'DEFAULTER' : 'OK'}</span></td>
                    <td className="py-2.5 px-4 text-slate-500">{sub.requiredClassesToReachThreshold > 0 ? <span className="text-red-600">+{sub.requiredClassesToReachThreshold} needed</span> : <span className="text-emerald-600">Safe</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily log */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Session Log</p>
            <select className="text-xs border border-slate-200 rounded-lg px-2 py-1" value={studentSubjectFilter} onChange={(e) => setStudentSubjectFilter(e.target.value)}>
              <option value="ALL">All Subjects</option>
              {evaluation.subjectSummaries.map((sub: any) => <option key={sub.subjectCode} value={sub.subjectCode}>{sub.subjectCode}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Date</th><th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Faculty</th><th className="py-2.5 px-4">Topic</th>
                  <th className="py-2.5 px-4">Status</th><th className="py-2.5 px-4">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No records.</td></tr>
                ) : filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4"><p className="font-medium text-slate-700">{new Date(log.date).toLocaleDateString()}</p><p className="text-[10px] text-slate-400 font-mono">{log.time}</p></td>
                    <td className="py-2.5 px-4"><p className="font-medium text-slate-800">{log.subjectName}</p><span className="text-[10px] font-mono text-slate-400">{log.subjectCode}</span></td>
                    <td className="py-2.5 px-4 text-slate-600">{log.facultyName}</td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-[180px] truncate">{log.topicCovered}</td>
                    <td className="py-2.5 px-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : log.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{log.status}</span></td>
                    <td className="py-2.5 px-4"><span className="flex items-center gap-1 text-[11px] text-slate-400"><Lock className="w-3 h-3" />Locked</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- FACULTY / ADMIN VIEW ---
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Attendance Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Mark daily sessions and track defaulters</p>
        </div>
        <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs font-medium">
          <button onClick={() => setActiveTab('mark')} className={`px-3 py-1.5 transition ${activeTab === 'mark' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Mark Attendance</button>
          <button onClick={() => setActiveTab('defaulters')} className={`px-3 py-1.5 transition flex items-center gap-1.5 ${activeTab === 'defaulters' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            <AlertTriangle className="w-3.5 h-3.5" /> Defaulters ({defaulters.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>
      ) : activeTab === 'mark' ? (
        <div className="space-y-5">
          {/* Session Config */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-800 mb-4">Session Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Subject</label><select className={inputCls} value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}</select></div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Section / Division</label>
                <select
                  className={inputCls}
                  value={selectedSectionId}
                  onChange={(e) => onSectionChange(e.target.value)}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.deptCode}] {s.name} &bull; {s.batchName}
                    </option>
                  ))}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Date</label><input type="date" className={inputCls} value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Time Slot</label><input className={inputCls} value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} placeholder="09:00 - 10:00" /></div>
            </div>
            <div className="mt-3"><label className="block text-xs font-medium text-slate-700 mb-1">Topic Covered</label><input className={inputCls} value={topicCovered} onChange={(e) => setTopicCovered(e.target.value)} placeholder="e.g. Chapter 3 — Sorting Algorithms" /></div>
          </div>

          {/* Student list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Students ({students.length})</p>
              <div className="flex gap-2">
                <button onClick={() => markAll('PRESENT')} className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"><CheckCircle2 className="w-3.5 h-3.5" />All Present</button>
                <button onClick={() => markAll('ABSENT')} className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition"><XCircle className="w-3.5 h-3.5" />All Absent</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Roll No.</th><th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Branch</th><th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-slate-600">{s.rollNumber}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{s.firstName} {s.lastName}</td>
                      <td className="py-2.5 px-4"><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{s.department?.code}</span></td>
                      <td className="py-2.5 px-4">
                        <div className="flex justify-center gap-2">
                          {(['PRESENT', 'ABSENT', 'LATE'] as const).map((status) => (
                            <button key={status} onClick={() => setStatus(s.id, status)} className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${attendanceMap[s.id] === status ? (status === 'PRESENT' ? 'bg-emerald-600 text-white' : status === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={handleSaveAttendance} className="px-5 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">Save Attendance</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Attendance Defaulters — Below 75%</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Student</th><th className="py-2.5 px-4">Roll No.</th>
                  <th className="py-2.5 px-4">Branch</th><th className="py-2.5 px-4">Attendance</th><th className="py-2.5 px-4">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaulters.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">No defaulters found.</td></tr>
                ) : defaulters.map((d: any) => (
                  <tr key={d.studentId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{d.studentName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{d.rollNumber}</td>
                    <td className="py-2.5 px-4"><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{d.departmentCode}</span></td>
                    <td className="py-2.5 px-4"><span className="font-bold text-red-600">{d.attendancePercentage}%</span></td>
                    <td className="py-2.5 px-4 text-slate-500">{d.attendedSessions}/{d.totalSessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
