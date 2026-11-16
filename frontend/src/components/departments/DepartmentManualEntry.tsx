import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  Save,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface DepartmentManualEntryProps {
  deptCode: string;
  deptId?: string;
  deptName: string;
  faculty: any[];
  subjects: any[];
  sections: any[];
  students: any[];
  onRefresh: () => void;
  onNavigateTab: (tab: 'attendance' | 'syllabus' | 'load') => void;
}

export const DepartmentManualEntry: React.FC<DepartmentManualEntryProps> = ({
  deptCode,
  deptId,
  deptName,
  faculty,
  subjects,
  sections,
  students,
  onRefresh,
  onNavigateTab,
}) => {
  const [subTab, setSubTab] = useState<'attendance' | 'addTopic' | 'topicStatus' | 'teachingLoad' | 'addStudent'>('attendance');

  // -------------------------------------------------------------
  // 1. Manual Attendance State
  // -------------------------------------------------------------
  const [attSectionId, setAttSectionId] = useState('');
  const [attSubjectId, setAttSubjectId] = useState('');
  const [attFacultyId, setAttFacultyId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attTime, setAttTime] = useState('09:00 - 10:00');
  const [attTopic, setAttTopic] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>>({});
  const [attSubmitting, setAttSubmitting] = useState(false);

  // Filter students for the selected section
  const sectionStudents = React.useMemo(() => {
    if (!attSectionId) return [];
    return students.filter((s) => s.sectionId === attSectionId || s.division === sections.find((x) => x.id === attSectionId)?.name);
  }, [students, attSectionId, sections]);

  // Set default dropdowns when faculty or subjects load
  useEffect(() => {
    if (sections.length > 0 && !attSectionId) setAttSectionId(sections[0].id);
    if (subjects.length > 0 && !attSubjectId) setAttSubjectId(subjects[0].id);
    if (faculty.length > 0 && !attFacultyId) setAttFacultyId(faculty[0].id || faculty[0].facultyId);
  }, [sections, subjects, faculty]);

  // Reset attendance map when section changes
  useEffect(() => {
    const initialMap: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
    sectionStudents.forEach((st) => {
      initialMap[st.id] = 'PRESENT';
    });
    setAttendanceMap(initialMap);
  }, [sectionStudents]);

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const updated: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
    sectionStudents.forEach((st) => {
      updated[st.id] = status;
    });
    setAttendanceMap(updated);
  };

  const setStudentStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attSectionId || !attSubjectId || !attFacultyId) {
      alert('Please select Section, Subject, and Faculty.');
      return;
    }
    if (sectionStudents.length === 0) {
      alert('No students found in the selected section.');
      return;
    }

    setAttSubmitting(true);
    try {
      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      await apiClient.post('/departments/attendance/manual-session', {
        sectionId: attSectionId,
        subjectId: attSubjectId,
        facultyId: attFacultyId,
        sessionDate: attDate,
        sessionTime: attTime,
        topicCovered: attTopic || 'Regular Lecture',
        records,
      });

      alert(`✅ Attendance successfully saved for ${records.length} students!`);
      setAttTopic('');
      onRefresh();
      onNavigateTab('attendance');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save attendance session.');
    } finally {
      setAttSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // 2. Add Syllabus Topic State
  // -------------------------------------------------------------
  const [topicFacultyId, setTopicFacultyId] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicAllottedHours, setTopicAllottedHours] = useState(2);
  const [topicStatus, setTopicStatus] = useState<'PENDING' | 'DONE'>('PENDING');
  const [topicSubmitting, setTopicSubmitting] = useState(false);

  useEffect(() => {
    if (faculty.length > 0 && !topicFacultyId) {
      setTopicFacultyId(faculty[0].id || faculty[0].facultyId);
    }
  }, [faculty]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicFacultyId || !topicTitle) {
      alert('Please select a professor and enter topic title.');
      return;
    }
    setTopicSubmitting(true);
    try {
      await apiClient.post('/departments/syllabus/add-topic', {
        facultyId: topicFacultyId,
        title: topicTitle.trim(),
        allottedMinutes: Math.round(Number(topicAllottedHours) * 60),
        status: topicStatus,
      });

      alert('✅ Syllabus topic added successfully!');
      setTopicTitle('');
      onRefresh();
      onNavigateTab('syllabus');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add topic.');
    } finally {
      setTopicSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Topic Status Toggle State
  // -------------------------------------------------------------
  const [toggleFacultyId, setToggleFacultyId] = useState('');
  const selectedFacultyMember = faculty.find(
    (f) => (f.id || f.facultyId) === toggleFacultyId
  ) || faculty[0];

  useEffect(() => {
    if (faculty.length > 0 && !toggleFacultyId) {
      setToggleFacultyId(faculty[0].id || faculty[0].facultyId);
    }
  }, [faculty]);

  const handleToggleTopic = async (topicId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    try {
      await apiClient.patch('/departments/syllabus/topic-status', {
        topicId,
        status: nextStatus,
      });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update topic status.');
    }
  };

  // -------------------------------------------------------------
  // 4. Update Faculty Teaching Load State
  // -------------------------------------------------------------
  const [loadFacultyId, setLoadFacultyId] = useState('');
  const [allottedHours, setAllottedHours] = useState(20);
  const [completedHours, setCompletedHours] = useState(0);
  const [addExtraLoad, setAddExtraLoad] = useState(false);
  const [loadSubmitting, setLoadSubmitting] = useState(false);

  useEffect(() => {
    if (faculty.length > 0 && !loadFacultyId) {
      const f = faculty[0];
      setLoadFacultyId(f.id || f.facultyId);
      setAllottedHours(f.allottedHours || f.maxWeeklyHours || 20);
      setCompletedHours(f.completedHours || f.currentLoadHours || 0);
    }
  }, [faculty]);

  const handleFacultyLoadChange = (facId: string) => {
    setLoadFacultyId(facId);
    const f = faculty.find((x) => (x.id || x.facultyId) === facId);
    if (f) {
      setAllottedHours(f.allottedHours || f.maxWeeklyHours || 20);
      setCompletedHours(f.completedHours || f.currentLoadHours || 0);
    }
  };

  const handleSaveLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadFacultyId) return;
    setLoadSubmitting(true);
    try {
      await apiClient.put('/departments/faculty/load', {
        facultyId: loadFacultyId,
        maxWeeklyHours: Number(allottedHours),
        currentLoadHours: Number(completedHours),
        addExtraLoad,
      });

      alert('✅ Teaching load updated successfully!');
      onRefresh();
      onNavigateTab('load');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update load.');
    } finally {
      setLoadSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Manual Data Entry & Updates</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              Zero Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manually record attendance, add curriculum topics, toggle topic completion, and assign teaching workload for {deptName}.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex flex-wrap border border-slate-200 bg-white rounded-xl p-1 shadow-2xs text-xs font-semibold">
          <button
            onClick={() => setSubTab('attendance')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'attendance'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Record Attendance
          </button>

          <button
            onClick={() => setSubTab('addTopic')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'addTopic'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📚 Add Syllabus Topic
          </button>

          <button
            onClick={() => setSubTab('topicStatus')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'topicStatus'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔄 Topic Status
          </button>

          <button
            onClick={() => setSubTab('teachingLoad')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'teachingLoad'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⏱️ Update Workload
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* ========================================================= */}
        {/* SUB-TAB 1: RECORD ATTENDANCE MANUALLY                    */}
        {/* ========================================================= */}
        {subTab === 'attendance' && (
          <form onSubmit={handleSaveAttendance} className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                1. Lecture Session Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Section / Division
                  </label>
                  <select
                    className={inputCls}
                    value={attSectionId}
                    onChange={(e) => setAttSectionId(e.target.value)}
                    required
                  >
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} ({sec.batchName || 'Active Batch'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Course / Subject
                  </label>
                  <select
                    className={inputCls}
                    value={attSubjectId}
                    onChange={(e) => setAttSubjectId(e.target.value)}
                    required
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Conducting Professor
                  </label>
                  <select
                    className={inputCls}
                    value={attFacultyId}
                    onChange={(e) => setAttFacultyId(e.target.value)}
                    required
                  >
                    {faculty.map((fac) => (
                      <option key={fac.id || fac.facultyId} value={fac.id || fac.facultyId}>
                        Prof. {fac.firstName || fac.name} ({fac.employeeId || 'Faculty'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date & Time Slot
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className={inputCls}
                      value={attDate}
                      onChange={(e) => setAttDate(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className={inputCls}
                      value={attTime}
                      onChange={(e) => setAttTime(e.target.value)}
                      placeholder="09:00 - 10:00"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Topic Covered in Session
                </label>
                <input
                  type="text"
                  className={inputCls}
                  value={attTopic}
                  onChange={(e) => setAttTopic(e.target.value)}
                  placeholder="e.g. Chapter 2 — Linked Lists & Pointers Implementation"
                />
              </div>
            </div>

            {/* Students attendance grid */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  2. Mark Student Attendance ({sectionStudents.length} Enrolled Students)
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => markAll('PRESENT')}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition border border-emerald-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAll('ABSENT')}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition border border-red-200"
                  >
                    <XCircle className="w-3.5 h-3.5" /> All Absent
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {sectionStudents.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No students currently mapped to this division.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-4">Roll Number</th>
                        <th className="py-2 px-4">Student Name</th>
                        <th className="py-2 px-4">Division</th>
                        <th className="py-2 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sectionStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-4 font-mono font-bold text-slate-700">
                            {st.rollNumber}
                          </td>
                          <td className="py-2 px-4 font-medium text-slate-900">
                            {st.firstName} {st.lastName}
                          </td>
                          <td className="py-2 px-4 text-slate-500">
                            {st.division || 'Division A'}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              {(['PRESENT', 'ABSENT', 'LATE'] as const).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setStudentStatus(st.id, status)}
                                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                                    attendanceMap[st.id] === status
                                      ? status === 'PRESENT'
                                        ? 'bg-emerald-600 text-white'
                                        : status === 'ABSENT'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-amber-500 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={attSubmitting || sectionStudents.length === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Attendance Session &bull; Update Live Metrics
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 2: ADD SYLLABUS TOPIC                            */}
        {/* ========================================================= */}
        {subTab === 'addTopic' && (
          <form onSubmit={handleAddTopic} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Professor
              </label>
              <select
                className={inputCls}
                value={topicFacultyId}
                onChange={(e) => setTopicFacultyId(e.target.value)}
                required
              >
                {faculty.map((fac) => (
                  <option key={fac.id || fac.facultyId} value={fac.id || fac.facultyId}>
                    Prof. {fac.firstName || fac.name} ({fac.employeeId || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Topic / Unit Title
              </label>
              <input
                type="text"
                className={inputCls}
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="e.g. Unit 3: Tree Traversals & Binary Search Trees"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Allotted Teaching Time (Hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className={inputCls}
                  value={topicAllottedHours}
                  onChange={(e) => setTopicAllottedHours(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Initial Status
                </label>
                <select
                  className={inputCls}
                  value={topicStatus}
                  onChange={(e) => setTopicStatus(e.target.value as any)}
                >
                  <option value="PENDING">PENDING (In Progress / Incomplete)</option>
                  <option value="DONE">DONE (Completed & Verified)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={topicSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add Topic to Professor Load
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 3: TOPIC STATUS TOGGLE                           */}
        {/* ========================================================= */}
        {subTab === 'topicStatus' && (
          <div className="space-y-4">
            <div className="max-w-sm">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Professor to Inspect & Toggle Topics
              </label>
              <select
                className={inputCls}
                value={toggleFacultyId}
                onChange={(e) => setToggleFacultyId(e.target.value)}
              >
                {faculty.map((fac) => (
                  <option key={fac.id || fac.facultyId} value={fac.id || fac.facultyId}>
                    Prof. {fac.firstName || fac.name} ({fac.employeeId || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Assigned Syllabus Units for {selectedFacultyMember?.name || 'Selected Faculty'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Click status button to instantly toggle between DONE and PENDING
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {(!selectedFacultyMember?.topics || selectedFacultyMember.topics.length === 0) ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No topics currently recorded for this professor. Use "Add Syllabus Topic" tab above.
                  </div>
                ) : (
                  selectedFacultyMember.topics.map((t: any) => (
                    <div
                      key={t.id}
                      className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/70 transition"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{t.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Allotted: <strong className="text-slate-700">{Number((t.allottedMinutes / 60).toFixed(1))} hrs</strong> ({t.allottedMinutes} mins load)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleTopic(t.id, t.status)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          t.status === 'DONE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {t.status === 'DONE' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mark as Pending
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Mark as Done
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 4: UPDATE TEACHING WORKLOAD                      */}
        {/* ========================================================= */}
        {subTab === 'teachingLoad' && (
          <form onSubmit={handleSaveLoad} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Professor
              </label>
              <select
                className={inputCls}
                value={loadFacultyId}
                onChange={(e) => handleFacultyLoadChange(e.target.value)}
                required
              >
                {faculty.map((fac) => (
                  <option key={fac.id || fac.facultyId} value={fac.id || fac.facultyId}>
                    Prof. {fac.firstName || fac.name} ({fac.employeeId || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Allotted Weekly Load (Hours)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="40"
                  className={inputCls}
                  value={allottedHours}
                  onChange={(e) => setAllottedHours(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Delivered / Completed Load (Hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="60"
                  className={inputCls}
                  value={completedHours}
                  onChange={(e) => setCompletedHours(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
              <input
                type="checkbox"
                id="addExtra"
                checked={addExtraLoad}
                onChange={(e) => setAddExtraLoad(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="addExtra" className="cursor-pointer">
                <strong>Log 1 Compensatory Extra Load Period</strong> (e.g. for missed or overflow lecture)
              </label>
            </div>

            <button
              type="submit"
              disabled={loadSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Teaching Workload &bull; Update Metrics
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
