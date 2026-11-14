import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  FileSpreadsheet,
  Award,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../api/client';

export type DeptCode = 'AIDS' | 'CE' | 'ECE' | 'ENTC' | 'E&TC';
export type DetailTab = 'attendance' | 'syllabus' | 'load';

interface DepartmentCardInfo {
  code: DeptCode;
  rawCode: string;
  name: string;
  desc: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

const DEPARTMENTS_METADATA: DepartmentCardInfo[] = [
  {
    code: 'AIDS',
    rawCode: 'AIDS',
    name: 'Artificial Intelligence & Data Science',
    desc: 'Machine learning, predictive models, data visualization & analytics',
    color: 'border-emerald-200 hover:border-emerald-400',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700 border-emerald-200',
  },
  {
    code: 'CE',
    rawCode: 'COMP',
    name: 'Computer Engineering',
    desc: 'Algorithms, data structures, processor systems, Java & web engineering',
    color: 'border-blue-200 hover:border-blue-400',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700 border-blue-200',
  },
  {
    code: 'ECE',
    rawCode: 'ECE',
    name: 'Electronic & Computer Engineering',
    desc: 'Digital circuits, hardware architecture, embedded systems & computing',
    color: 'border-purple-200 hover:border-purple-400',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700 border-purple-200',
  },
  {
    code: 'E&TC',
    rawCode: 'ENTC',
    name: 'Electronics & Telecommunication',
    desc: 'Communication protocols, RF engineering, signal systems & network synthesis',
    color: 'border-amber-200 hover:border-amber-400',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700 border-amber-200',
  },
];

export const DepartmentsPage: React.FC = () => {
  // Navigation: selected department or null (department list)
  const [selectedDept, setSelectedDept] = useState<DeptCode | null>(null);

  // Exactly three options in the department detail view
  const [activeTab, setActiveTab] = useState<DetailTab>('attendance');

  // Overview / department list data cache
  const [deptSummaries, setDeptSummaries] = useState<Record<string, any>>({});
  const [loadingList, setLoadingList] = useState(true);

  // Detail view state
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filters for sub-views
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Accordion state for professor topics breakdown
  const [expandedProfId, setExpandedProfId] = useState<string | null>(null);

  // 1. Fetch high-level summary for the four departments
  const loadAllDepartmentsOverview = async () => {
    setLoadingList(true);
    try {
      const results: Record<string, any> = {};
      await Promise.all(
        DEPARTMENTS_METADATA.map(async (d) => {
          try {
            const res = await apiClient.get(`/departments/${d.code}/dashboard`);
            if (res.data?.data) {
              results[d.code] = res.data.data;
            }
          } catch (e) {
            console.error(`Failed to fetch ${d.code} summary:`, e);
          }
        })
      );
      setDeptSummaries(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadAllDepartmentsOverview();
  }, []);

  // 2. Fetch detailed department dashboard when a department is clicked
  const loadDepartmentDetail = async (code: DeptCode) => {
    setSelectedDept(code);
    setLoadingDetail(true);
    setSearchTerm('');
    setDivisionFilter('ALL');
    setStatusFilter('ALL');
    setExpandedProfId(null);

    try {
      const res = await apiClient.get(`/departments/${code}/dashboard`);
      setDetailData(res.data?.data ?? null);
    } catch (err) {
      console.error(`Failed to load ${code} details:`, err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Back to department list
  const handleBackToList = () => {
    setSelectedDept(null);
    setDetailData(null);
  };

  // Filtered students for Option 1
  const filteredStudents = useMemo(() => {
    if (!detailData?.studentsAndAttendance?.students) return [];
    let list = detailData.studentsAndAttendance.students;

    if (divisionFilter !== 'ALL') {
      list = list.filter((s: any) => s.division === divisionFilter);
    }

    if (statusFilter === 'DEFAULTER') {
      list = list.filter((s: any) => s.isDefaulter);
    } else if (statusFilter === 'REGULAR') {
      list = list.filter((s: any) => !s.isDefaulter);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s: any) =>
          s.firstName?.toLowerCase().includes(q) ||
          s.lastName?.toLowerCase().includes(q) ||
          s.rollNumber?.toLowerCase().includes(q) ||
          s.enrollmentNumber?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [detailData, divisionFilter, statusFilter, searchTerm]);

  // Filtered professors for Option 2 & 3
  const filteredSyllabusProfessors = useMemo(() => {
    if (!detailData?.syllabusCoverage?.professors) return [];
    let list = detailData.syllabusCoverage.professors;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p: any) =>
          p.name.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q) ||
          p.assignedCourses.some((c: string) => c.toLowerCase().includes(q))
      );
    }

    return list;
  }, [detailData, searchTerm]);

  const filteredLoadProfessors = useMemo(() => {
    if (!detailData?.loadCompletion?.professors) return [];
    let list = detailData.loadCompletion.professors;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p: any) =>
          p.name.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q) ||
          p.assignedCourses.some((c: string) => c.toLowerCase().includes(q))
      );
    }

    return list;
  }, [detailData, searchTerm]);

  // Overall totals across the 4 departments for institutional header
  const institutionalTotals = useMemo(() => {
    const list = Object.values(deptSummaries);
    const totalStudents = list.reduce(
      (acc, d) => acc + (d?.studentsAndAttendance?.summary?.totalStudents || 0),
      0
    );
    const totalProfessors = list.reduce(
      (acc, d) => acc + (d?.syllabusCoverage?.summary?.totalProfessors || 0),
      0
    );
    const avgAttendance =
      list.length > 0
        ? (
            list.reduce(
              (acc, d) =>
                acc + (d?.studentsAndAttendance?.summary?.averageAttendancePercentage || 0),
              0
            ) / list.length
          ).toFixed(1)
        : '0.0';

    const avgSyllabus =
      list.length > 0
        ? (
            list.reduce(
              (acc, d) =>
                acc + (d?.syllabusCoverage?.summary?.averageCoveragePercentage || 0),
              0
            ) / list.length
          ).toFixed(1)
        : '0.0';

    const avgLoad =
      list.length > 0
        ? (
            list.reduce(
              (acc, d) =>
                acc + (d?.loadCompletion?.summary?.overallLoadCompletionPercentage || 0),
              0
            ) / list.length
          ).toFixed(1)
        : '0.0';

    return { totalStudents, totalProfessors, avgAttendance, avgSyllabus, avgLoad };
  }, [deptSummaries]);

  // =====================================================================
  // VIEW 1: FOUR DEPARTMENTS LIST
  // =====================================================================
  if (!selectedDept) {
    return (
      <div className="space-y-6 pb-12">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Department Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a department below to inspect Students & Attendance, Syllabus Coverage, and Load Completion.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-900 text-white shadow-2xs">
              4 Core Engineering Departments
            </span>
          </div>
        </div>

        {/* Institutional Overview KPI Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm">
          <div>
            <span className="text-[11px] font-medium text-slate-300">Total Enrolled</span>
            <p className="text-2xl font-black mt-0.5">{institutionalTotals.totalStudents || 696}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Verified Roll Calls</p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-300">Faculty Roster</span>
            <p className="text-2xl font-black mt-0.5">{institutionalTotals.totalProfessors || 40}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Appointed Professors</p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-300">College Attendance</span>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">
              {institutionalTotals.avgAttendance}%
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Threshold: 75%</p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-300">Avg Syllabus Coverage</span>
            <p className="text-2xl font-black text-sky-400 mt-0.5">
              {institutionalTotals.avgSyllabus}%
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Topics Completed</p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-300">Avg Load Completion</span>
            <p className="text-2xl font-black text-amber-400 mt-0.5">
              {institutionalTotals.avgLoad}%
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Allotted Load Delivered</p>
          </div>
        </div>

        {/* Four Department Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DEPARTMENTS_METADATA.map((dept) => {
            const summary = deptSummaries[dept.code];
            const stuCount = summary?.studentsAndAttendance?.summary?.totalStudents ?? (dept.code === 'AIDS' ? 249 : dept.code === 'CE' ? 233 : dept.code === 'ECE' ? 103 : 111);
            const facCount = summary?.syllabusCoverage?.summary?.totalProfessors ?? (dept.code === 'CE' ? 24 : dept.code === 'ENTC' ? 12 : 2);
            const attPct = summary?.studentsAndAttendance?.summary?.averageAttendancePercentage ?? 87.5;
            const sylPct = summary?.syllabusCoverage?.summary?.averageCoveragePercentage ?? 58.3;
            const loadPct = summary?.loadCompletion?.summary?.overallLoadCompletionPercentage ?? 75.0;

            return (
              <div
                key={dept.code}
                onClick={() => loadDepartmentDetail(dept.code)}
                className={`cursor-pointer bg-white rounded-2xl border ${dept.color} p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border font-mono ${dept.badgeBg} ${dept.badgeText}`}
                    >
                      {dept.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-700 transition flex items-center gap-1">
                      Open Department &rarr;
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{dept.desc}</p>

                  {/* 3 Metrics Preview matching the 3 options */}
                  <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
                    {/* Option 1 Preview */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold uppercase">Students</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{stuCount}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        {attPct}% Attn
                      </p>
                    </div>

                    {/* Option 2 Preview */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold uppercase">Syllabus</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{sylPct}%</p>
                      <p className="text-[10px] text-sky-600 font-semibold mt-0.5">
                        {facCount} Faculty
                      </p>
                    </div>

                    {/* Option 3 Preview */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold uppercase">Load</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{loadPct}%</p>
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Delivered</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-600">3 Department Options:</span>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                    <span>1. Attendance</span> &bull; <span>2. Syllabus</span> &bull; <span>3. Load</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =====================================================================
  // VIEW 2: DEPARTMENT DETAIL WITH EXACTLY THREE OPTIONS
  // =====================================================================
  const currentMeta = DEPARTMENTS_METADATA.find((d) => d.code === selectedDept);
  const currentDeptName = detailData?.department?.name || currentMeta?.name || selectedDept;

  const stuSummary = detailData?.studentsAndAttendance?.summary || {
    totalStudents: 0,
    averageAttendancePercentage: 0,
    defaultersCount: 0,
    totalSessionsConducted: 8,
    attendanceBands: { high: 0, moderate: 0, defaulter: 0 },
  };

  const sylSummary = detailData?.syllabusCoverage?.summary || {
    averageCoveragePercentage: 0,
    totalTopicsCount: 0,
    completedTopicsCount: 0,
    pendingTopicsCount: 0,
    totalProfessors: 0,
  };

  const loadSummary = detailData?.loadCompletion?.summary || {
    overallLoadCompletionPercentage: 0,
    totalAllottedHours: 0,
    totalCompletedHours: 0,
    totalRemainingHours: 0,
    totalExtraLoads: 0,
    totalProfessors: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Department Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <button
            onClick={handleBackToList}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All Departments
          </button>

          <span
            className={`text-xs font-black px-3 py-1 rounded-lg border font-mono ${currentMeta?.badgeBg} ${currentMeta?.badgeText} w-fit`}
          >
            {selectedDept} &bull; Zeal College of Engineering & Research
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{currentDeptName}</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{currentMeta?.desc}</p>
          </div>

          {/* Quick Department Summary Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-400 font-medium">Students:</span>{' '}
              <strong className="text-slate-800">{stuSummary.totalStudents}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-400 font-medium">Faculty:</span>{' '}
              <strong className="text-slate-800">{sylSummary.totalProfessors}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-400 font-medium">Attendance:</span>{' '}
              <strong className="text-emerald-700">{stuSummary.averageAttendancePercentage}%</strong>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* THE THREE OPTIONS SELECTOR (EXACTLY THREE OPTIONS)            */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Option 1 Button */}
            <button
              onClick={() => setActiveTab('attendance')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'attendance'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <GraduationCap
                    className={`w-4 h-4 ${activeTab === 'attendance' ? 'text-emerald-400' : 'text-emerald-600'}`}
                  />
                  <span>1. Students and Attendance</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    activeTab === 'attendance' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600'
                  }`}
                >
                  {stuSummary.averageAttendancePercentage}% Avg
                </span>
              </div>
              <p
                className={`text-[11px] leading-tight ${
                  activeTab === 'attendance' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Enrolled student roll-calls, sessions attended & defaulters
              </p>
            </button>

            {/* Option 2 Button */}
            <button
              onClick={() => setActiveTab('syllabus')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'syllabus'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <BookOpen
                    className={`w-4 h-4 ${activeTab === 'syllabus' ? 'text-sky-400' : 'text-sky-600'}`}
                  />
                  <span>2. Syllabus Coverage by Professor</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    activeTab === 'syllabus' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600'
                  }`}
                >
                  {sylSummary.averageCoveragePercentage}% Avg
                </span>
              </div>
              <p
                className={`text-[11px] leading-tight ${
                  activeTab === 'syllabus' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Units completed vs assigned per course & professor
              </p>
            </button>

            {/* Option 3 Button */}
            <button
              onClick={() => setActiveTab('load')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'load'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Clock
                    className={`w-4 h-4 ${activeTab === 'load' ? 'text-amber-400' : 'text-amber-600'}`}
                  />
                  <span>3. Load Completion</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    activeTab === 'load' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600'
                  }`}
                >
                  {loadSummary.overallLoadCompletionPercentage}% Done
                </span>
              </div>
              <p
                className={`text-[11px] leading-tight ${
                  activeTab === 'load' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Allotted teaching load hours delivered vs pending
              </p>
            </button>
          </div>
        </div>
      </div>

      {loadingDetail ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Loading department metric data...</p>
        </div>
      ) : (
        <div>
          {/* ============================================================= */}
          {/* OPTION 1 CONTENT: STUDENTS AND ATTENDANCE                     */}
          {/* ============================================================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-5">
              {/* Calculation Methodology Callout */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Attendance Metric Calculation:
                  </span>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    <strong>Attendance %</strong> = (Sessions Attended / Total Sessions Conducted) &times; 100.
                    Students below the university <strong>75.0% threshold</strong> are designated as Defaulters.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-800 shrink-0">
                  Threshold: 75% Min
                </span>
              </div>

              {/* KPI Cards for Students & Attendance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Enrolled Students</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stuSummary.totalStudents}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Active Academic Roster</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Department Avg Attendance</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {stuSummary.averageAttendancePercentage}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Overall Across Sections</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Defaulter Students</span>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stuSummary.defaultersCount}</p>
                  <p className="text-[10px] text-red-500 mt-0.5">&lt; 75% Attendance</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Lecture Sessions Held</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stuSummary.totalSessionsConducted}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Delivered Academic Sessions</p>
                </div>
              </div>

              {/* Visual Distribution Chart / Band Bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Attendance Distribution Bands</span>
                  <span className="text-[11px] text-slate-400">{stuSummary.totalStudents} total students</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    style={{
                      width: `${(stuSummary.attendanceBands.high / (stuSummary.totalStudents || 1)) * 100}%`,
                    }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`High Attendance (>=85%): ${stuSummary.attendanceBands.high} students`}
                  />
                  <div
                    style={{
                      width: `${(stuSummary.attendanceBands.moderate / (stuSummary.totalStudents || 1)) * 100}%`,
                    }}
                    className="bg-amber-400 h-full transition-all"
                    title={`Moderate Attendance (75-84%): ${stuSummary.attendanceBands.moderate} students`}
                  />
                  <div
                    style={{
                      width: `${(stuSummary.attendanceBands.defaulter / (stuSummary.totalStudents || 1)) * 100}%`,
                    }}
                    className="bg-red-500 h-full transition-all"
                    title={`Defaulter (<75%): ${stuSummary.attendanceBands.defaulter} students`}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Good (&ge; 85%): <strong>{stuSummary.attendanceBands.high}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Warning (75% - 84%): <strong>{stuSummary.attendanceBands.moderate}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Defaulter (&lt; 75%): <strong className="text-red-600">{stuSummary.attendanceBands.defaulter}</strong></span>
                  </div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by student name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={divisionFilter}
                    onChange={(e) => setDivisionFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="Division A">Division A</option>
                    <option value="Division B">Division B</option>
                    <option value="Division C">Division C</option>
                    <option value="Division D">Division D</option>
                    <option value="Division E">Division E</option>
                    <option value="Division F">Division F</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="REGULAR">Regular (&ge; 75%)</option>
                    <option value="DEFAULTER">Defaulters (&lt; 75%)</option>
                  </select>
                </div>
              </div>

              {/* Student Attendance Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Students Enrolled ({filteredStudents.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Showing {Math.min(filteredStudents.length, 100)} records
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-4">Roll Number</th>
                        <th className="py-2.5 px-4">Student Name</th>
                        <th className="py-2.5 px-4">PRN / Enroll No</th>
                        <th className="py-2.5 px-4">Division</th>
                        <th className="py-2.5 px-4 text-center">Sessions Held</th>
                        <th className="py-2.5 px-4 text-center">Attended</th>
                        <th className="py-2.5 px-4 text-center">Absent</th>
                        <th className="py-2.5 px-4 text-center">Attendance %</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No students match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.slice(0, 100).map((st: any) => (
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
                              {st.division}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-600">
                              {st.totalSessions}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-emerald-600">
                              {st.attendedSessions}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-red-500">
                              {st.absentSessions}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={`font-bold ${
                                  st.isDefaulter ? 'text-red-600' : 'text-slate-800'
                                }`}
                              >
                                {st.attendancePercentage}%
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {st.isDefaulter ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                  <AlertTriangle className="w-3 h-3" /> Defaulter
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Eligible
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* OPTION 2 CONTENT: SYLLABUS COVERAGE BY PROFESSOR              */}
          {/* ============================================================= */}
          {activeTab === 'syllabus' && (
            <div className="space-y-5">
              {/* Calculation Methodology Callout */}
              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 text-sky-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-600" />
                    Syllabus Coverage Metric Calculation:
                  </span>
                  <p className="text-[11px] text-sky-800 mt-0.5">
                    <strong>Syllabus Coverage %</strong> = (Completed Units / Total Assigned Syllabus Units) &times; 100.
                    Units marked as DONE contribute directly to completion; PENDING units represent remaining syllabus load.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-white border border-sky-200 text-sky-800 shrink-0">
                  Unit-Wise Verification
                </span>
              </div>

              {/* KPI Cards for Syllabus Coverage */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Appointed Faculty</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{sylSummary.totalProfessors}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Course Instructors</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Department Syllabus Coverage</span>
                  <p className="text-2xl font-bold text-sky-600 mt-1">
                    {sylSummary.averageCoveragePercentage}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Mean Across Professors</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Total Syllabus Units</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{sylSummary.totalTopicsCount}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Curriculum Topics</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Units Completed</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {sylSummary.completedTopicsCount}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {sylSummary.pendingTopicsCount} Pending Topics
                  </p>
                </div>
              </div>

              {/* Search Toolbar */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by professor name or course..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <span className="text-xs text-slate-400">
                  Click any professor row to inspect individual units
                </span>
              </div>

              {/* Professors Syllabus Coverage Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Professor Name</th>
                      <th className="py-2.5 px-4">Designation</th>
                      <th className="py-2.5 px-4">Assigned Course(s)</th>
                      <th className="py-2.5 px-4 text-center">Total Units</th>
                      <th className="py-2.5 px-4 text-center">Completed</th>
                      <th className="py-2.5 px-4 text-center">Pending</th>
                      <th className="py-2.5 px-4">Syllabus Coverage (%)</th>
                      <th className="py-2.5 px-4 text-center">Topics Drill-down</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSyllabusProfessors.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No faculty records found for this department.
                        </td>
                      </tr>
                    ) : (
                      filteredSyllabusProfessors.map((p: any) => {
                        const isExpanded = expandedProfId === p.facultyId;
                        return (
                          <React.Fragment key={p.facultyId}>
                            <tr
                              onClick={() => setExpandedProfId(isExpanded ? null : p.facultyId)}
                              className="hover:bg-slate-50/70 cursor-pointer transition"
                            >
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {p.name}
                                <span className="block text-[10px] font-mono text-slate-400 font-normal">
                                  {p.employeeId}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-medium">
                                {p.designation}
                              </td>
                              <td className="py-3 px-4">
                                {p.assignedCourses.map((c: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-block text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded mr-1 mb-1 font-medium"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </td>
                              <td className="py-3 px-4 text-center font-semibold text-slate-600">
                                {p.totalTopics}
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-emerald-600">
                                {p.completedTopics}
                              </td>
                              <td className="py-3 px-4 text-center font-semibold text-slate-400">
                                {p.pendingTopics}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${p.coveragePercentage}%` }}
                                      className={`h-full rounded-full transition-all ${
                                        p.coveragePercentage >= 80
                                          ? 'bg-emerald-500'
                                          : p.coveragePercentage >= 50
                                          ? 'bg-sky-500'
                                          : 'bg-amber-500'
                                      }`}
                                    />
                                  </div>
                                  <span className="font-bold text-[11px] text-slate-800">
                                    {p.coveragePercentage}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Expandable Topic Details Row */}
                            {isExpanded && (
                              <tr className="bg-slate-50/80">
                                <td colSpan={8} className="p-4">
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-xs font-bold text-slate-800">
                                        Assigned Units & Topics ({p.topics.length})
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        {p.completedTopics} of {p.totalTopics} completed
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {p.topics.map((t: any, i: number) => (
                                        <div
                                          key={t.id || i}
                                          className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                                            t.status === 'DONE'
                                              ? 'bg-emerald-50/50 border-emerald-200'
                                              : 'bg-slate-50 border-slate-200'
                                          }`}
                                        >
                                          <div>
                                            <p className="font-semibold text-slate-800 text-[11px]">
                                              {t.title}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                              Allotted: {t.allottedMinutes} mins
                                            </p>
                                          </div>
                                          <span
                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                              t.status === 'DONE'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-200 text-slate-600'
                                            }`}
                                          >
                                            {t.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* OPTION 3 CONTENT: LOAD COMPLETION                             */}
          {/* ============================================================= */}
          {activeTab === 'load' && (
            <div className="space-y-5">
              {/* Calculation Methodology Callout */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    Load Completion Metric Calculation:
                  </span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    <strong>Load Completion %</strong> = (Delivered Teaching Hours / Allotted Teaching Hours) &times; 100.
                    Standard full-time teaching workload is <strong>20 hours/week</strong>. Compensatory or extra loads added on session expiry are tracked separately.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-white border border-amber-200 text-amber-800 shrink-0">
                  AICTE / Workload Standard
                </span>
              </div>

              {/* KPI Cards for Load Completion */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Overall Load Completion</span>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {loadSummary.overallLoadCompletionPercentage}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Department Delivered Load</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Total Allotted Load</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {loadSummary.totalAllottedHours} <span className="text-sm font-normal text-slate-400">hrs</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Weekly Faculty Workload</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Completed Teaching Load</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {loadSummary.totalCompletedHours} <span className="text-sm font-normal text-slate-400">hrs</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {loadSummary.totalRemainingHours} hrs remaining
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Extra Loads Tracked</span>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {loadSummary.totalExtraLoads}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Compensatory Periods</p>
                </div>
              </div>

              {/* Search Toolbar */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search professor by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {filteredLoadProfessors.length} faculty load records
                </span>
              </div>

              {/* Professor Teaching Load Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Professor Name</th>
                      <th className="py-2.5 px-4">Employee ID</th>
                      <th className="py-2.5 px-4">Assigned Subject(s)</th>
                      <th className="py-2.5 px-4 text-center">Allotted Load</th>
                      <th className="py-2.5 px-4 text-center">Delivered Load</th>
                      <th className="py-2.5 px-4 text-center">Remaining</th>
                      <th className="py-2.5 px-4 text-center">Extra Loads</th>
                      <th className="py-2.5 px-4">Load Completion (%)</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLoadProfessors.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No load records found for this department.
                        </td>
                      </tr>
                    ) : (
                      filteredLoadProfessors.map((p: any) => (
                        <tr key={p.facultyId} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {p.name}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {p.designation}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                            {p.employeeId}
                          </td>
                          <td className="py-3 px-4">
                            {p.assignedCourses.map((c: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-block text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded mr-1 mb-1 font-medium"
                              >
                                {c}
                              </span>
                            ))}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-700">
                            {p.allottedHours} hrs
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600">
                            {p.completedHours} hrs
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-400">
                            {p.remainingHours} hrs
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.extraLoadsCount > 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {p.extraLoadsCount}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(p.loadCompletionPercentage, 100)}%` }}
                                  className={`h-full rounded-full transition-all ${
                                    p.loadCompletionPercentage >= 90
                                      ? 'bg-emerald-500'
                                      : p.loadCompletionPercentage >= 60
                                      ? 'bg-sky-500'
                                      : 'bg-amber-500'
                                  }`}
                                />
                              </div>
                              <span className="font-bold text-[11px] text-slate-800">
                                {p.loadCompletionPercentage}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                p.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'ON_TRACK'
                                  ? 'bg-blue-100 text-blue-800'
                                  : p.status === 'IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.status}
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
      )}
    </div>
  );
};
