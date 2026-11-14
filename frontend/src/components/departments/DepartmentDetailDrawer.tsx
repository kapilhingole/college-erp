import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Search,
  ExternalLink,
  X,
  Layers,
  ChevronRight,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { NodeId } from './DepartmentArchitectureMap';

interface DepartmentDetailDrawerProps {
  selectedNode: NodeId;
  onSelectNode: (nodeId: NodeId) => void;
  departments: any[];
  subjects: any[];
  faculty: any[];
  students: any[];
  syllabusSummary: any;
  loading: boolean;
}

export const DepartmentDetailDrawer: React.FC<DepartmentDetailDrawerProps> = ({
  selectedNode,
  onSelectNode,
  departments,
  subjects,
  faculty,
  students,
  syllabusSummary,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');

  // Map node to corresponding department code
  const nodeDeptCode = useMemo(() => {
    if (selectedNode.includes('CE')) return 'COMP'; // CE corresponds to COMP
    if (selectedNode.includes('AIDS')) return 'AIDS';
    if (selectedNode.includes('ECE')) return 'ECE';
    if (selectedNode.includes('ENTC')) return 'ENTC';
    return null;
  }, [selectedNode]);

  // Current department object
  const currentDept = useMemo(() => {
    if (!nodeDeptCode) return null;
    return departments.find((d) => d.code === nodeDeptCode) || null;
  }, [departments, nodeDeptCode]);

  // Filtered lists for the department
  const deptFaculty = useMemo(() => {
    if (!nodeDeptCode) return [];
    return faculty.filter((f) => f.department?.code === nodeDeptCode);
  }, [faculty, nodeDeptCode]);

  const deptStudents = useMemo(() => {
    if (!nodeDeptCode) return [];
    return students.filter((s) => s.department?.code === nodeDeptCode);
  }, [students, nodeDeptCode]);

  const deptSubjects = useMemo(() => {
    if (!nodeDeptCode) return [];
    return subjects.filter((s) => s.department?.code === nodeDeptCode);
  }, [subjects, nodeDeptCode]);

  const deptSyllabusRows = useMemo(() => {
    if (!syllabusSummary?.faculty || !nodeDeptCode) return [];
    return syllabusSummary.faculty.filter((f: any) => f.department?.code === nodeDeptCode);
  }, [syllabusSummary, nodeDeptCode]);

  // Determine which sub-view to display based on node
  const isCentral = selectedNode === 'CENTRAL_DEPARTMENT';
  const isDeptCloud = ['DEPT_CE', 'DEPT_AIDS', 'DEPT_ECE', 'DEPT_ENTC'].includes(selectedNode);
  const isSubjectsNode = selectedNode.includes('SUBJECT');
  const isStudentOverviewNode = selectedNode.includes('STUDENT_OVERVIEW');
  const isSyllabusNode = selectedNode.includes('SYLLABUS_MONITORING');

  // Breadcrumb items
  const breadcrumbs = useMemo(() => {
    const list = [{ label: 'DEPARTMENT (Central Hub)', id: 'CENTRAL_DEPARTMENT' as NodeId }];
    if (nodeDeptCode) {
      const deptCloudId =
        nodeDeptCode === 'COMP'
          ? 'DEPT_CE'
          : (`DEPT_${nodeDeptCode}` as NodeId);
      const deptLabel =
        nodeDeptCode === 'COMP' ? 'CE (Computer Engineering)' : nodeDeptCode;
      list.push({ label: deptLabel, id: deptCloudId });

      if (isSubjectsNode) {
        list.push({ label: 'Subjects & Professors', id: selectedNode });
      } else if (isStudentOverviewNode) {
        list.push({ label: 'Student Overview', id: selectedNode });
      } else if (isSyllabusNode) {
        list.push({ label: 'Syllabus & Load Monitoring', id: selectedNode });
      }
    }
    return list;
  }, [nodeDeptCode, selectedNode, isSubjectsNode, isStudentOverviewNode, isSyllabusNode]);

  // For AIDS & ECE two subject connections: filter Theory vs Practical
  const displaySubjects = useMemo(() => {
    let list = deptSubjects;
    if (selectedNode === 'AIDS_SUBJECTS_1' || selectedNode === 'ECE_SUBJECTS_1') {
      // 1 = Theory
      list = list.filter((s) => s.type === 'THEORY' || s.credits >= 3);
    } else if (selectedNode === 'AIDS_SUBJECTS_2' || selectedNode === 'ECE_SUBJECTS_2') {
      // 2 = Practical / Lab
      list = list.filter((s) => s.type === 'PRACTICAL' || s.credits < 3);
    }

    if (selectedSemester !== 'ALL') {
      list = list.filter((s) => String(s.semester) === selectedSemester);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q)
      );
    }
    return list;
  }, [deptSubjects, selectedNode, selectedSemester, searchTerm]);

  // Filtered students for student overview
  const displayStudents = useMemo(() => {
    let list = deptStudents;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.firstName?.toLowerCase().includes(q) ||
          s.lastName?.toLowerCase().includes(q) ||
          s.rollNumber?.toLowerCase().includes(q) ||
          s.enrollmentNumber?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [deptStudents, searchTerm]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mt-6">
      {/* Drawer Header & Breadcrumb Path */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b.id + i}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              <button
                onClick={() => onSelectNode(b.id)}
                className={`font-semibold transition hover:underline ${
                  i === breadcrumbs.length - 1
                    ? 'text-slate-900 bg-white px-2.5 py-1 rounded-md shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {b.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {currentDept && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              {currentDept.name} ({currentDept.code})
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* ======================================================== */}
        {/* VIEW 1: CENTRAL DEPARTMENT INSTITUTION-WIDE OVERVIEW     */}
        {/* ======================================================== */}
        {isCentral && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Central Department Architecture Overview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Institutional hub governing Zeal College of Engineering and Research across 4 core engineering branches
              </p>
            </div>

            {/* High Level KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Active Departments</span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-slate-900">4</p>
                <p className="text-[11px] text-slate-400 mt-1">CE &bull; AIDS &bull; ECE &bull; E&TC</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Total Students</span>
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{students.length || 696}</p>
                <p className="text-[11px] text-slate-400 mt-1">Branch-wise Roll-calls</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Total Faculty</span>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{faculty.length || 40}</p>
                <p className="text-[11px] text-slate-400 mt-1">Academic Roster</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Syllabus Progress</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {syllabusSummary?.totals?.averagePercentage ?? 0}%
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {syllabusSummary?.totals?.totalExtraLoads ?? 0} Extra Loads Tracked
                </p>
              </div>
            </div>

            {/* Department Comparison Matrix */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Branch Architecture Matrix
              </p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Diagram Node</th>
                      <th className="py-3 px-4 text-center">Enrolled Students</th>
                      <th className="py-3 px-4 text-center">Faculty</th>
                      <th className="py-3 px-4 text-center">Subjects</th>
                      <th className="py-3 px-4 text-center">Syllabus Progress</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { code: 'COMP', label: 'Computer Engineering (CE)', diagramNode: 'CE (Top)', nodeId: 'DEPT_CE' as NodeId, students: 233, faculty: 24, subjects: 6 },
                      { code: 'AIDS', label: 'Artificial Intelligence & Data Science', diagramNode: 'AIDS (Left)', nodeId: 'DEPT_AIDS' as NodeId, students: 249, faculty: 2, subjects: 6 },
                      { code: 'ECE', label: 'Electronic & Computer Engineering', diagramNode: 'ECE (Right)', nodeId: 'DEPT_ECE' as NodeId, students: 103, faculty: 2, subjects: 6 },
                      { code: 'ENTC', label: 'Electronics & Telecommunication', diagramNode: 'E&TC (Bottom)', nodeId: 'DEPT_ENTC' as NodeId, students: 111, faculty: 12, subjects: 6 },
                    ].map((row) => (
                      <tr key={row.code} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {row.label}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium font-mono text-[11px]">
                          {row.diagramNode}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {students.filter((s) => s.department?.code === row.code).length || row.students}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {faculty.filter((f) => f.department?.code === row.code).length || row.faculty}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {subjects.filter((s) => s.department?.code === row.code).length || row.subjects}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-slate-700">
                            {syllabusSummary?.faculty
                              ? (
                                  syllabusSummary.faculty
                                    .filter((f: any) => f.department?.code === row.code)
                                    .reduce((acc: number, f: any) => acc + (f.summary?.percentage || 0), 0) /
                                  (syllabusSummary.faculty.filter((f: any) => f.department?.code === row.code).length || 1)
                                ).toFixed(1)
                              : 0}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onSelectNode(row.nodeId)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition"
                          >
                            Explore <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: DEPARTMENT CLOUD NODE HUB                        */}
        {/* ======================================================== */}
        {isDeptCloud && currentDept && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {currentDept.name} ({currentDept.code})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{currentDept.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectNode('CENTRAL_DEPARTMENT')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  &larr; Central Hub
                </button>
              </div>
            </div>

            {/* Department Quick Cards according to diagram connections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Subjects & Professors */}
              <div
                onClick={() => {
                  const target =
                    nodeDeptCode === 'COMP'
                      ? 'CE_SUBJECTS_PROFESSORS'
                      : nodeDeptCode === 'ENTC'
                      ? 'ENTC_SUBJECTS_PROFESSORS'
                      : (`${nodeDeptCode}_SUBJECTS_1` as NodeId);
                  onSelectNode(target);
                }}
                className="cursor-pointer p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm transition group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                  Subjects & Professors
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {deptSubjects.length} approved subjects & assigned faculty roster
                </p>
                <div className="mt-4 flex items-center text-xs font-medium text-blue-600 gap-1">
                  View syllabus & faculty <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card 2: Student Overview */}
              <div
                onClick={() => {
                  const target = (`${nodeDeptCode === 'COMP' ? 'CE' : nodeDeptCode}_STUDENT_OVERVIEW` as NodeId);
                  onSelectNode(target);
                }}
                className="cursor-pointer p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm transition group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition">
                  Department Student Overview
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {deptStudents.length} registered students across active divisions
                </p>
                <div className="mt-4 flex items-center text-xs font-medium text-emerald-600 gap-1">
                  Inspect student records <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card 3: Syllabus Monitoring */}
              <div
                onClick={() => {
                  const target =
                    nodeDeptCode === 'COMP'
                      ? 'CE_SYLLABUS_MONITORING'
                      : nodeDeptCode === 'ENTC'
                      ? 'ENTC_SYLLABUS_MONITORING'
                      : (`${nodeDeptCode}_SYLLABUS_MONITORING` as NodeId);
                  onSelectNode(target);
                }}
                className="cursor-pointer p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm transition group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition">
                  Syllabus Load Monitoring
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Track topic completion, allotted time expiry, and extra load periods
                </p>
                <div className="mt-4 flex items-center text-xs font-medium text-amber-600 gap-1">
                  View faculty loads <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Department Structure Overview (Programs & Sections) */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Department Programs & Divisions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(currentDept.programs || []).map((prog: any) => (
                  <div key={prog.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-800">{prog.name} ({prog.code})</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {prog.degreeType} &bull; {prog.totalSemesters} Semesters
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {prog.batches?.map((b: any) => (
                        <span key={b.id} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {b.name} ({b.sections?.length || 0} Sections)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: SUBJECT AND THEIR PROFESSOR                      */}
        {/* ======================================================== */}
        {isSubjectsNode && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Subjects and Their Professors
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentDept?.name} ({currentDept?.code}) &bull; Active Academic Curriculum
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 w-44"
                  />
                </div>

                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="ALL">All Semesters</option>
                  <option value="1">Semester 1 (FY)</option>
                  <option value="3">Semester 3 (SY)</option>
                </select>
              </div>
            </div>

            {/* Note about diagram's two-block outbound representation for AIDS/ECE */}
            {(selectedNode.includes('AIDS') || selectedNode.includes('ECE')) && (
              <div className="px-4 py-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                <span>
                  <strong>Diagram Mapping:</strong> Showing{' '}
                  {selectedNode.endsWith('1') ? 'Theory & Core Course Block' : 'Practical & Laboratory Block'} for{' '}
                  {nodeDeptCode}.
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onSelectNode((`${nodeDeptCode}_SUBJECTS_1`) as NodeId)
                    }
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      selectedNode.endsWith('1')
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-blue-700 border border-blue-200'
                    }`}
                  >
                    Theory Block
                  </button>
                  <button
                    onClick={() =>
                      onSelectNode((`${nodeDeptCode}_SUBJECTS_2`) as NodeId)
                    }
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      selectedNode.endsWith('2')
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-blue-700 border border-blue-200'
                    }`}
                  >
                    Lab Block
                  </button>
                </div>
              </div>
            )}

            {/* Subjects Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">Subject Title</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-center">Semester</th>
                    <th className="py-2.5 px-4 text-center">Credits</th>
                    <th className="py-2.5 px-4">Assigned Professor(s)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displaySubjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No subjects match your criteria.
                      </td>
                    </tr>
                  ) : (
                    displaySubjects.map((sub) => {
                      const assignedFaculty = (sub.subjectAssignments || []).map(
                        (a: any) => a.faculty
                      );
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {sub.code}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {sub.name}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                sub.type === 'THEORY'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {sub.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-600">
                            Sem {sub.semester}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-600">
                            {sub.credits}
                          </td>
                          <td className="py-3 px-4">
                            {assignedFaculty.length > 0 ? (
                              <div className="space-y-1">
                                {assignedFaculty.map((fac: any) => (
                                  <div key={fac.id} className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-800">
                                      Prof. {fac.firstName} {fac.lastName}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      ({fac.employeeId || 'Faculty'})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Department Pool</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: THAT DEPARTMENT STUDENT OVERVIEW                 */}
        {/* ======================================================== */}
        {isStudentOverviewNode && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {currentDept?.name} &bull; Student Overview
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Roll-call verification, division distribution, and enrollment status
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 w-56"
                />
              </div>
            </div>

            {/* Quick KPI stats for this department */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Total Enrolled</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{deptStudents.length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active Academic Year</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">First Year (FY)</span>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {deptStudents.filter((s) => s.batch?.name?.includes('2024-2028') || s.currentSemester === 1).length}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Batch 2024-2028</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Second Year (SY)</span>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {deptStudents.filter((s) => s.batch?.name?.includes('2023-2027') || s.currentSemester === 3).length}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Batch 2023-2027</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Divisions</span>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {new Set(deptStudents.map((s) => s.section?.name).filter(Boolean)).size || 2}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active Sections</p>
              </div>
            </div>

            {/* Students Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4">Roll No.</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4">PRN / Enroll No</th>
                    <th className="py-2.5 px-4">Division</th>
                    <th className="py-2.5 px-4">Batch</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No students found for this department.
                      </td>
                    </tr>
                  ) : (
                    displayStudents.slice(0, 100).map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                          {st.rollNumber}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {st.firstName} {st.lastName}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                          {st.enrollmentNumber || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                          {st.section?.name || 'Division A'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {st.batch?.name || 'Batch 2024-2028'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {st.academicStatus || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {displayStudents.length > 100 && (
              <p className="text-[11px] text-slate-400 text-center">
                Showing first 100 of {displayStudents.length} students. Use search to filter.
              </p>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: SYLLABUS MONITORING BY PROFESSOR LOAD COMPLETION  */}
        {/* ======================================================== */}
        {isSyllabusNode && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Syllabus Monitoring by Professor Load Completion
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentDept?.name} ({currentDept?.code}) &bull; Pure deterministic tracking ($1/2 = 50\%$)
                </p>
              </div>

              <NavLink
                to="/syllabus-admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
              >
                <Shield className="w-3.5 h-3.5" /> Superadmin Syllabus Console &rarr;
              </NavLink>
            </div>

            {/* Timing Rule Information Alert */}
            <div className="px-4 py-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
              <p className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Pure Deterministic Timing Rule:
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Each professor is assigned a load of topics with allotted time limits. When allotted time expires without completion, exactly one extra load period is tracked. Extra loads are displayed separately and <strong>never inflate</strong> the syllabus percentage.
              </p>
            </div>

            {/* Faculty Syllabus Load Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Faculty Member</th>
                    <th className="py-2.5 px-4">Designation</th>
                    <th className="py-2.5 px-4 text-center">Completed</th>
                    <th className="py-2.5 px-4 text-center">Pending</th>
                    <th className="py-2.5 px-4 text-center">Extra Loads</th>
                    <th className="py-2.5 px-4">Progress (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptSyllabusRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No faculty syllabus records found for this department.
                      </td>
                    </tr>
                  ) : (
                    deptSyllabusRows.map((row: any) => {
                      const summary = row.summary || {
                        totalTopics: 2,
                        completedTopics: 0,
                        pendingTopics: 2,
                        totalExtraLoads: 0,
                        percentage: 0,
                      };
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            Prof. {row.firstName} {row.lastName}
                            <span className="block text-[10px] font-mono text-slate-400 font-normal">
                              {row.employeeId || row.email}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {row.designation || 'Assistant Professor'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600">
                            {summary.completedTopics}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-500">
                            {summary.pendingTopics}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                summary.totalExtraLoads > 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {summary.totalExtraLoads}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    summary.percentage === 100
                                      ? 'bg-emerald-500'
                                      : summary.percentage > 0
                                      ? 'bg-blue-600'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${summary.percentage}%` }}
                                />
                              </div>
                              <span className="font-bold text-[11px] text-slate-800">
                                {summary.percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
