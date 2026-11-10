import React, { useEffect, useState } from 'react';
import { Building2, Plus, ChevronRight, Layers, Users, BookOpen, GraduationCap, Calendar, Hash } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal visibility
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showProgModal, setShowProgModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  // Form states: Department
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Form states: Program
  const [progDeptId, setProgDeptId] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progName, setProgName] = useState('');
  const [totalSemesters, setTotalSemesters] = useState(8);
  const [degreeType, setDegreeType] = useState<'UG' | 'PG' | 'DIPLOMA'>('UG');

  // Form states: Batch
  const [batchProgId, setBatchProgId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [startYear, setStartYear] = useState(2024);
  const [endYear, setEndYear] = useState(2028);
  const [currentSemester, setCurrentSemester] = useState(1);

  // Form states: Section
  const [secBatchId, setSecBatchId] = useState('');
  const [secName, setSecName] = useState('Division A');
  const [secCapacity, setSecCapacity] = useState(60);
  const [roomNumber, setRoomNumber] = useState('Room-201');

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchDepartments = () => {
    setLoading(true);
    apiClient
      .get('/departments')
      .then((res) => {
        setDepartments(res.data.data);
        if (res.data.data.length > 0) {
          setProgDeptId(res.data.data[0].id);
          const firstProg = res.data.data[0].programs?.[0];
          if (firstProg) {
            setBatchProgId(firstProg.id);
            const firstBatch = firstProg.batches?.[0];
            if (firstBatch) {
              setSecBatchId(firstBatch.id);
            }
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/departments', { code, name, description });
      setShowDeptModal(false);
      setCode('');
      setName('');
      setDescription('');
      fetchDepartments();
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
      fetchDepartments();
      alert('Degree Program created successfully!');
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
      fetchDepartments();
      alert('Academic Batch created successfully!');
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
      fetchDepartments();
      alert('Class Section created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create section.');
    }
  };

  // Flatten programs and batches for select dropdowns
  const allPrograms = departments.flatMap((d) =>
    (d.programs || []).map((p: any) => ({ ...p, deptCode: d.code, deptName: d.name }))
  );
  const allBatches = allPrograms.flatMap((p) =>
    (p.batches || []).map((b: any) => ({ ...b, progCode: p.code, progName: p.name }))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Hierarchy</h1>
          <p className="text-xs text-slate-500 mt-1">
            Department structure: College &rarr; Departments &rarr; Degree Programs &rarr; Batches &rarr; Class Sections
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowDeptModal(true)}
              className="px-3.5 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Department</span>
            </button>
            <button
              onClick={() => setShowProgModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Degree Program</span>
            </button>
            <button
              onClick={() => setShowBatchModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Batch</span>
            </button>
            <button
              onClick={() => setShowSectionModal(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Section</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading department structures...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {dept.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">{dept.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {dept.description || 'No description provided.'}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-indigo-200 shrink-0" />
              </div>

              {/* Counts */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="font-bold text-slate-800">{dept._count?.students || 0}</div>
                  <div className="text-[11px] text-slate-400">Students</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="font-bold text-slate-800">{dept._count?.faculty || 0}</div>
                  <div className="text-[11px] text-slate-400">Faculty</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="font-bold text-slate-800">{dept._count?.subjects || 0}</div>
                  <div className="text-[11px] text-slate-400">Subjects</div>
                </div>
              </div>

              {/* Sub-Programs & Batches */}
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Degree Programs &amp; Batches</span>
                  <span className="text-[11px] text-slate-400 normal-case font-normal">
                    {dept.programs?.length || 0} Program(s)
                  </span>
                </h4>
                {dept.programs?.map((prog: any) => (
                  <div
                    key={prog.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-2"
                  >
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{prog.name}</span>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono border border-indigo-100">
                        {prog.code}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {prog.batches && prog.batches.length > 0 ? (
                        prog.batches.map((b: any) => (
                          <div
                            key={b.id}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 shadow-xs flex items-center gap-1.5"
                          >
                            <span className="font-semibold">{b.name}</span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              (Sem {b.currentSemester})
                            </span>
                            {b.sections && b.sections.length > 0 && (
                              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                {b.sections.map((s: any) => s.name).join(', ')}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No batches created yet.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Create Department */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Academic Department</h3>
            <p className="text-xs text-slate-500 mb-4">Create a new core engineering department</p>
            <form onSubmit={handleCreateDept} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Code (e.g. COMP, AIDS, ENTC)
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="COMP"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase focus:ring-2 focus:ring-zes-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Computer Engineering"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-zes-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specialization, lab infrastructure..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-zes-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Degree Program */}
      {showProgModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Degree Program</h3>
            <p className="text-xs text-slate-500 mb-4">Attach an accredited program to a department</p>
            <form onSubmit={handleCreateProgram} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={progDeptId}
                  onChange={(e) => setProgDeptId(e.target.value)}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Program Code</label>
                  <input
                    type="text"
                    required
                    value={progCode}
                    onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                    placeholder="BE-COMP"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Type</label>
                  <select
                    value={degreeType}
                    onChange={(e) => setDegreeType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="DIPLOMA">Diploma</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Program Full Name</label>
                <input
                  type="text"
                  required
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  placeholder="Bachelor of Engineering in Computer Engineering"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Semesters</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={totalSemesters}
                  onChange={(e) => setTotalSemesters(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Batch */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Academic Batch</h3>
            <p className="text-xs text-slate-500 mb-4">Define an intake cohort for a degree program</p>
            <form onSubmit={handleCreateBatch} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Program</label>
                <select
                  value={batchProgId}
                  onChange={(e) => setBatchProgId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {allPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.deptCode}: {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Label / Name</label>
                <input
                  type="text"
                  required
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Batch 2024-2028 (FY)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Session</label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2024-25"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={currentSemester}
                    onChange={(e) => setCurrentSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Year</label>
                  <input
                    type="number"
                    required
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Year</label>
                  <input
                    type="number"
                    required
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Create Section */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Class Section / Division</h3>
            <p className="text-xs text-slate-500 mb-4">Allocate student classroom section for a batch</p>
            <form onSubmit={handleCreateSection} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch</label>
                <select
                  value={secBatchId}
                  onChange={(e) => setSecBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {allBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.progCode}: {b.name} (Year {b.academicYear})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Section / Division Name</label>
                <input
                  type="text"
                  required
                  value={secName}
                  onChange={(e) => setSecName(e.target.value)}
                  placeholder="Division A or Div-1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Capacity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={secCapacity}
                    onChange={(e) => setSecCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Classroom Room No</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Room-201"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
