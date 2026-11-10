import React, { useEffect, useState, useRef } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Layers,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp,
  Settings,
  Sliders,
  Hash,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showModal, setShowModal] = useState(false);

  // ZPRN Config state
  const [showZprnModal, setShowZprnModal] = useState(false);
  const [zprnConfig, setZprnConfig] = useState<any>(null);
  const [zprnPrefix, setZprnPrefix] = useState('ZPRN');
  const [zprnStartNum, setZprnStartNum] = useState(240001);
  const [zprnPadding, setZprnPadding] = useState(5);

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('2005-01-01');
  const [gender, setGender] = useState('MALE');
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [currentSemester, setCurrentSemester] = useState(1);
  const [customEnrollmentNumber, setCustomEnrollmentNumber] = useState('');

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchStudents = () => {
    setLoading(true);
    const params: any = {};
    if (search) params.search = search;
    if (selectedDept) params.departmentId = selectedDept;

    apiClient
      .get('/students', { params })
      .then((res) => setStudents(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchZprnConfig = () => {
    apiClient
      .get('/students/zprn-config')
      .then((res) => {
        if (res.data.data) {
          setZprnConfig(res.data.data);
          setZprnPrefix(res.data.data.prefix || 'ZPRN');
          setZprnStartNum(res.data.data.startNumber || 240001);
          setZprnPadding(res.data.data.padding || 5);
        }
      })
      .catch((err) => console.error('Failed to load ZPRN config:', err));
  };

  useEffect(() => {
    fetchStudents();
    fetchZprnConfig();
    apiClient.get('/departments').then((res) => {
      setDepartments(res.data.data);
      if (res.data.data.length > 0) {
        setDepartmentId(res.data.data[0].id);
        if (res.data.data[0].programs?.length > 0) {
          setProgramId(res.data.data[0].programs[0].id);
          if (res.data.data[0].programs[0].batches?.length > 0) {
            setBatchId(res.data.data[0].programs[0].batches[0].id);
          }
        }
      }
    });
  }, []);

  const handleDeptSelectChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    const matchedDept = departments.find((d) => d.id === newDeptId);
    if (matchedDept && matchedDept.programs?.length > 0) {
      setProgramId(matchedDept.programs[0].id);
      if (matchedDept.programs[0].batches?.length > 0) {
        setBatchId(matchedDept.programs[0].batches[0].id);
      } else {
        setBatchId('');
      }
    } else {
      setProgramId('');
      setBatchId('');
    }
  };

  const handleProgramSelectChange = (newProgId: string) => {
    setProgramId(newProgId);
    const matchedDept = departments.find((d) => d.id === departmentId);
    const matchedProg = matchedDept?.programs?.find((p: any) => p.id === newProgId);
    if (matchedProg && matchedProg.batches?.length > 0) {
      setBatchId(matchedProg.batches[0].id);
    } else {
      setBatchId('');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/students/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'zeal_students_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to download template: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Please select an Excel (.xlsx, .xls) or CSV file first.');
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const response = await apiClient.post('/students/bulk-import', {
            fileBase64: base64Data,
          });
          setImportResult(response.data);
          fetchStudents();
        } catch (postErr: any) {
          setImportError(postErr.response?.data?.message || 'Bulk import failed. Please check spreadsheet format.');
        } finally {
          setImporting(false);
        }
      };
      reader.onerror = () => {
        setImportError('Failed to read file from disk.');
        setImporting(false);
      };
      reader.readAsDataURL(importFile);
    } catch (err: any) {
      setImportError(err.message || 'An error occurred during file upload.');
      setImporting(false);
    }
  };

  const handleAdmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dob,
        gender,
        departmentId,
        programId,
        batchId,
        currentSemester: Number(currentSemester),
      };

      if (customEnrollmentNumber.trim()) {
        payload.enrollmentNumber = customEnrollmentNumber.trim().toUpperCase();
      }

      const res = await apiClient.post('/students', payload);

      setShowModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCustomEnrollmentNumber('');
      fetchStudents();
      fetchZprnConfig();
      alert(res.data.message || 'Student admitted successfully! Default password is Student@123');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Admission failed.');
    }
  };

  const handleSaveZprnConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.put('/students/zprn-config', {
        prefix: zprnPrefix.trim().toUpperCase(),
        startNumber: Number(zprnStartNum),
        padding: Number(zprnPadding),
      });
      alert(res.data.message || 'ZPRN sequence updated successfully!');
      setShowZprnModal(false);
      fetchZprnConfig();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update ZPRN settings.');
    }
  };

  const currentDept = departments.find((d) => d.id === departmentId);
  const currentPrograms = currentDept?.programs || [];
  const currentProg = currentPrograms.find((p: any) => p.id === programId);
  const currentBatches = currentProg?.batches || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enrollment records, ZPRN allocation sequence, and semester tracking (Induri Campus)
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                fetchZprnConfig();
                setShowZprnModal(true);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 border border-slate-300"
              title="Configure starting ZPRN counter and prefix"
            >
              <Sliders className="w-3.5 h-3.5 text-zes-700" />
              <span>ZPRN Setup</span>
              {zprnConfig && (
                <span className="font-mono text-[10px] bg-zes-200/80 px-1.5 py-0.2 rounded text-zes-900 font-bold">
                  {zprnConfig.nextZprn}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShowImportModal(true);
                setImportResult(null);
                setImportError(null);
                setImportFile(null);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-zes-700 to-zes-600 hover:from-zes-800 hover:to-zes-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk Import (Excel/CSV)</span>
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Admit Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, or enrollment number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Department &amp; Program</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Batch / Section</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No student records matching query.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        {s.firstName} {s.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono font-normal">
                        {s.enrollmentNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {s.rollNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{s.department?.name}</div>
                      <div className="text-[11px] text-slate-500">{s.program?.name}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      Semester {s.currentSemester}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{s.batch?.name}</div>
                      <div className="text-[11px] text-indigo-600">
                        {s.section?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div>{s.email}</div>
                      <div className="text-[11px]">{s.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {s.academicStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Admission Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Student Admission Onboarding</h3>
            <p className="text-xs text-slate-500 mb-4">
              Provisions user credentials and enrolls student into academic cohort with auto-allocated ZPRN
            </p>
            <form onSubmit={handleAdmitStudent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => handleDeptSelectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Program</label>
                  <select
                    value={programId}
                    onChange={(e) => handleProgramSelectChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {currentPrograms.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Batch</label>
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {currentBatches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={currentSemester}
                    onChange={(e) => setCurrentSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom ZPRN (Optional)
                  </label>
                  <input
                    type="text"
                    value={customEnrollmentNumber}
                    onChange={(e) => setCustomEnrollmentNumber(e.target.value)}
                    placeholder={zprnConfig ? `Auto: ${zprnConfig.nextZprn}` : 'e.g. ZPRN240100'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-semibold"
                >
                  Admit Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: ZPRN Sequence Setup Modal */}
      {showZprnModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-zes-50 text-zes-800 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">ZPRN Sequence Setup</h3>
                  <p className="text-[11px] text-slate-500">Configure auto-generated student PRN base values</p>
                </div>
              </div>
              <button onClick={() => setShowZprnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {zprnConfig && (
              <div className="my-4 p-3.5 bg-gradient-to-r from-zes-50 to-indigo-50 border border-zes-200 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Current Next Assigned ZPRN:</span>
                  <span className="font-mono font-black text-zes-900 text-sm bg-white px-2 py-0.5 rounded border border-zes-300">
                    {zprnConfig.nextZprn}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>Current Base Counter:</span>
                  <span className="font-mono">{zprnConfig.currentNumber}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveZprnConfig} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ZPRN Prefix (e.g. ZPRN, ZES, PRN)
                </label>
                <input
                  type="text"
                  required
                  value={zprnPrefix}
                  onChange={(e) => setZprnPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Starting Counter / Number (e.g. 240001)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={zprnStartNum}
                  onChange={(e) => setZprnStartNum(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  New student admissions will increment continuously starting from this value.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Zero Padding Digits (e.g. 5 or 6)
                </label>
                <input
                  type="number"
                  required
                  min={3}
                  max={10}
                  value={zprnPadding}
                  onChange={(e) => setZprnPadding(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowZprnModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold"
                >
                  Save Sequence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Bulk Excel/CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-zes-50 text-zes-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bulk Student Onboarding</h3>
                  <p className="text-xs text-slate-500">
                    Upload roll call spreadsheet (.xlsx or .csv) to batch provision students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4 my-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  importFile
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-zes-500 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0]);
                      setImportError(null);
                    }
                  }}
                  className="hidden"
                />
                <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                {importFile ? (
                  <div>
                    <span className="text-xs font-bold text-emerald-800 block">{importFile.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {(importFile.size / 1024).toFixed(1)} KB • Click to change file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">
                      Click to browse or drop student roll-call Excel/CSV file here
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Supports SPPU / DTE Maharashtra standard tabular sheets
                    </span>
                  </div>
                )}
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}

              {importResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Successfully imported <strong>{importResult.importedCount}</strong> student records!
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs font-bold text-zes-700 hover:text-zes-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Template</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={importing || !importFile}
                    className="px-5 py-2 bg-gradient-to-r from-zes-700 to-zes-600 hover:from-zes-800 hover:to-zes-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {importing ? 'Processing File...' : 'Upload & Import Students'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
