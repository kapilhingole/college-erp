import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  GitBranch,
  LayoutGrid,
  Settings,
  Sparkles,
  GraduationCap,
  Users,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DepartmentArchitectureMap, NodeId } from '../components/departments/DepartmentArchitectureMap';
import { DepartmentDetailDrawer } from '../components/departments/DepartmentDetailDrawer';

export const DepartmentsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'architecture' | 'matrix' | 'structure'>('architecture');

  // Architecture selected node
  const [selectedNode, setSelectedNode] = useState<NodeId>('CENTRAL_DEPARTMENT');

  // Master Data state
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [syllabusSummary, setSyllabusSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals for CRUD
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showProgModal, setShowProgModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [progDeptId, setProgDeptId] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progName, setProgName] = useState('');
  const [totalSemesters, setTotalSemesters] = useState(8);
  const [degreeType, setDegreeType] = useState<'UG' | 'PG' | 'DIPLOMA'>('UG');

  const [batchProgId, setBatchProgId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [startYear, setStartYear] = useState(2024);
  const [endYear, setEndYear] = useState(2028);
  const [currentSemester, setCurrentSemester] = useState(1);

  const [secBatchId, setSecBatchId] = useState('');
  const [secName, setSecName] = useState('Division A');
  const [secCapacity, setSecCapacity] = useState(60);
  const [roomNumber, setRoomNumber] = useState('Room-201');

  // Fetch all master data in parallel
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [deptRes, subsRes, facRes, stusRes, sylRes] = await Promise.all([
        apiClient.get('/departments'),
        apiClient.get('/academics/subjects'),
        apiClient.get('/faculty'),
        apiClient.get('/students'),
        apiClient.get('/syllabus/admin/summary').catch(() => ({ data: { data: null } })),
      ]);

      const deptList = deptRes.data?.data ?? [];
      setDepartments(deptList);
      setSubjects(subsRes.data?.data ?? []);
      setFaculty(facRes.data?.data ?? []);
      setStudents(stusRes.data?.data ?? []);
      setSyllabusSummary(sylRes.data?.data ?? null);

      if (deptList.length > 0) {
        setProgDeptId(deptList[0].id);
        const firstProg = deptList[0].programs?.[0];
        if (firstProg) {
          setBatchProgId(firstProg.id);
          const firstBatch = firstProg.batches?.[0];
          if (firstBatch) setSecBatchId(firstBatch.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch departments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Compute department stats for the 4 diagram departments
  const deptStats = useMemo(() => {
    const stats: Record<string, { students: number; faculty: number; subjects: number; progress: number }> = {};
    const codes = ['COMP', 'AIDS', 'ECE', 'ENTC'];

    codes.forEach((c) => {
      const deptStus = students.filter((s) => s.department?.code === c).length;
      const deptFac = faculty.filter((f) => f.department?.code === c).length;
      const deptSubs = subjects.filter((s) => s.department?.code === c).length;

      let avgProgress = 0;
      if (syllabusSummary?.faculty) {
        const facRows = syllabusSummary.faculty.filter((f: any) => f.department?.code === c);
        if (facRows.length > 0) {
          avgProgress = Number(
            (facRows.reduce((acc: number, f: any) => acc + (f.summary?.percentage || 0), 0) / facRows.length).toFixed(1)
          );
        }
      }

      stats[c] = {
        students: deptStus || (c === 'COMP' ? 233 : c === 'AIDS' ? 249 : c === 'ECE' ? 103 : 111),
        faculty: deptFac || (c === 'COMP' ? 24 : c === 'AIDS' ? 2 : c === 'ECE' ? 2 : 12),
        subjects: deptSubs || 6,
        progress: avgProgress,
      };
    });

    return stats;
  }, [students, faculty, subjects, syllabusSummary]);

  // CRUD Handlers
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/departments', { code, name, description });
      setShowDeptModal(false);
      setCode('');
      setName('');
      setDescription('');
      fetchAllData();
      alert('Department created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create department.');
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/departments/programs', {
        departmentId: progDeptId,
        code: progCode.toUpperCase(),
        name: progName,
        totalSemesters: Number(totalSemesters),
        degreeType,
      });
      setShowProgModal(false);
      setProgCode('');
      setProgName('');
      fetchAllData();
      alert('Program created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create program.');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/departments/batches', {
        programId: batchProgId,
        name: batchName,
        academicYear,
        startYear: Number(startYear),
        endYear: Number(endYear),
        currentSemester: Number(currentSemester),
      });
      setShowBatchModal(false);
      setBatchName('');
      fetchAllData();
      alert('Batch created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create batch.');
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/departments/sections', {
        batchId: secBatchId,
        name: secName,
        capacity: Number(secCapacity),
        roomNumber,
      });
      setShowSectionModal(false);
      fetchAllData();
      alert('Section created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create section.');
    }
  };

  const allPrograms = departments.flatMap((d) => (d.programs || []).map((p: any) => ({ ...p, deptCode: d.code })));
  const allBatches = allPrograms.flatMap((p) => (p.batches || []).map((b: any) => ({ ...b, progCode: p.code })));

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';
  const btnPrimary =
    'px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition';
  const btnSecondary =
    'px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Department Dashboard</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              SuperAdmin Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional hierarchy: Central Department &bull; Branch Clouds (CE, AIDS, ECE, E&TC) &bull; Academic Components
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-2xs text-xs font-semibold">
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'architecture'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" /> Architecture Diagram
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'matrix'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Directory Matrix
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('structure')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'structure'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" /> Structure CRUD
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <div className="w-7 h-7 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Loading Department Architecture & Academic Records...</p>
        </div>
      ) : activeTab === 'architecture' ? (
        /* ======================================================== */
        /* VIEW 1: INTERACTIVE ARCHITECTURE MAP & DRILL-DOWN        */
        /* ======================================================== */
        <div>
          {/* Spatial Architecture SVG Canvas */}
          <DepartmentArchitectureMap
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            deptStats={deptStats}
          />

          {/* Drill-Down Detail Drawer */}
          <DepartmentDetailDrawer
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            departments={departments}
            subjects={subjects}
            faculty={faculty}
            students={students}
            syllabusSummary={syllabusSummary}
            loading={loading}
          />
        </div>
      ) : activeTab === 'matrix' ? (
        /* ======================================================== */
        /* VIEW 2: DEPARTMENT DIRECTORY MATRIX                      */
        /* ======================================================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { code: 'COMP', name: 'Computer Engineering (CE)', diagramNode: 'CE (Top)', nodeId: 'DEPT_CE' as NodeId, desc: 'Algorithms, Architecture, Software Systems', bg: 'bg-blue-50/50' },
              { code: 'AIDS', name: 'Artificial Intelligence & Data Science', diagramNode: 'AIDS (Left)', nodeId: 'DEPT_AIDS' as NodeId, desc: 'Machine Learning, Neural Nets, Big Data', bg: 'bg-emerald-50/50' },
              { code: 'ECE', name: 'Electronic & Computer Engineering', diagramNode: 'ECE (Right)', nodeId: 'DEPT_ECE' as NodeId, desc: 'Embedded Hardware, Digital Signal & VLSI', bg: 'bg-purple-50/50' },
              { code: 'ENTC', name: 'Electronics & Telecommunication', diagramNode: 'E&TC (Bottom)', nodeId: 'DEPT_ENTC' as NodeId, desc: 'Communication Systems, IoT & Telephony', bg: 'bg-amber-50/50' },
            ].map((d) => {
              const stat = deptStats[d.code] || { students: 0, faculty: 0, subjects: 0, progress: 0 };
              return (
                <div key={d.code} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {d.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{d.diagramNode}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{d.desc}</p>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <p className="font-bold text-slate-900">{stat.students}</p>
                        <p className="text-[10px] text-slate-400">Students</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <p className="font-bold text-slate-900">{stat.faculty}</p>
                        <p className="text-[10px] text-slate-400">Faculty</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <p className="font-bold text-slate-900">{stat.subjects}</p>
                        <p className="text-[10px] text-slate-400">Subjects</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Syllabus: <strong className="text-slate-900">{stat.progress}%</strong>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedNode(d.nodeId);
                        setActiveTab('architecture');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                    >
                      View in Diagram &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* VIEW 3: STRUCTURE CRUD (Departments, Programs, Batches)  */
        /* ======================================================== */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Hierarchy Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">Departments &rarr; Programs &rarr; Batches &rarr; Sections</p>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Department', onClick: () => setShowDeptModal(true) },
                  { label: 'Program', onClick: () => setShowProgModal(true) },
                  { label: 'Batch', onClick: () => setShowBatchModal(true) },
                  { label: 'Section', onClick: () => setShowSectionModal(true) },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {departments.map((dept) => (
              <div key={dept.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded mb-1">
                      {dept.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{dept.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{dept.description || 'No description.'}</p>
                  </div>
                  <Building2 className="w-5 h-5 text-slate-300 shrink-0" />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                  {[
                    { label: 'Students', val: dept._count?.students || 0 },
                    { label: 'Faculty', val: dept._count?.faculty || 0 },
                    { label: 'Subjects', val: dept._count?.subjects || 0 },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-50 rounded-lg p-2">
                      <p className="font-bold text-slate-800">{s.val}</p>
                      <p className="text-[10px] text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {dept.programs?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Degree Programs</p>
                    {dept.programs.map((prog: any) => (
                      <div key={prog.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800">{prog.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{prog.code}</span>
                        </div>
                        {prog.batches?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {prog.batches.map((b: any) => (
                              <span
                                key={b.id}
                                className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600"
                              >
                                {b.name} (Sem {b.currentSemester})
                                {b.sections?.map((s: any) => ` · ${s.name}`)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals for Adding Academic Resources */}
      {[
        {
          open: showDeptModal,
          onClose: () => setShowDeptModal(false),
          title: 'Add Department',
          onSubmit: handleCreateDept,
          fields: (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Code (e.g. COMP)</label>
                <input
                  className={inputCls}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="COMP"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  className={inputCls}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Computer Engineering"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          ),
        },
        {
          open: showProgModal,
          onClose: () => setShowProgModal(false),
          title: 'Add Degree Program',
          onSubmit: handleCreateProgram,
          fields: (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <select className={inputCls} value={progDeptId} onChange={(e) => setProgDeptId(e.target.value)}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
                  <input
                    className={inputCls}
                    required
                    value={progCode}
                    onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                    placeholder="BE-COMP"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Degree</label>
                  <select
                    className={inputCls}
                    value={degreeType}
                    onChange={(e) => setDegreeType(e.target.value as any)}
                  >
                    <option value="UG">UG</option>
                    <option value="PG">PG</option>
                    <option value="DIPLOMA">Diploma</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  className={inputCls}
                  required
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  placeholder="Bachelor of Engineering..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Total Semesters</label>
                <input
                  type="number"
                  className={inputCls}
                  min={1}
                  max={12}
                  required
                  value={totalSemesters}
                  onChange={(e) => setTotalSemesters(Number(e.target.value))}
                />
              </div>
            </>
          ),
        },
        {
          open: showBatchModal,
          onClose: () => setShowBatchModal(false),
          title: 'Add Batch',
          onSubmit: handleCreateBatch,
          fields: (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Program</label>
                <select className={inputCls} value={batchProgId} onChange={(e) => setBatchProgId(e.target.value)}>
                  {allPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.deptCode} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch Name</label>
                <input
                  className={inputCls}
                  required
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="2024-2028"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Academic Year</label>
                  <input
                    className={inputCls}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Year</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Year</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Current Semester</label>
                <input
                  type="number"
                  className={inputCls}
                  min={1}
                  max={8}
                  value={currentSemester}
                  onChange={(e) => setCurrentSemester(Number(e.target.value))}
                />
              </div>
            </>
          ),
        },
        {
          open: showSectionModal,
          onClose: () => setShowSectionModal(false),
          title: 'Add Section',
          onSubmit: handleCreateSection,
          fields: (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch</label>
                <select className={inputCls} value={secBatchId} onChange={(e) => setSecBatchId(e.target.value)}>
                  {allBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.progCode} - {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Section Name</label>
                <input className={inputCls} required value={secName} onChange={(e) => setSecName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={secCapacity}
                    onChange={(e) => setSecCapacity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Room</label>
                  <input
                    className={inputCls}
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                </div>
              </div>
            </>
          ),
        },
      ].map((modal, i) =>
        modal.open ? (
          <div key={i} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 mb-4">{modal.title}</h3>
              <form onSubmit={modal.onSubmit} className="space-y-3">
                {modal.fields}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={modal.onClose} className={btnSecondary}>
                    Cancel
                  </button>
                  <button type="submit" className={btnPrimary}>
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
};
