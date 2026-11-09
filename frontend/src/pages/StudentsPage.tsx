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

  useEffect(() => {
    fetchStudents();
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
      await apiClient.post('/students', {
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
      });

      setShowModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      fetchStudents();
      alert('Student admitted successfully! Default password is Student@123');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Admission failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enrollment records, roll number allocation, and semester tracking (Induri Campus)
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportResult(null);
                setImportError(null);
                setImportFile(null);
              }}
              className="px-4 py-2 bg-gradient-to-r from-zes-700 to-zes-600 hover:from-zes-800 hover:to-zes-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Import (Excel/CSV)</span>
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Admit Single Student</span>
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

      {/* Admission Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Student Admission Onboarding</h3>
            <p className="text-xs text-slate-500 mb-4">
              Provisions user credentials and enrolls student into academic batch
            </p>
            <form onSubmit={handleAdmitStudent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
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

      {/* Bulk Excel/CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-zes-50 text-zes-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Bulk Student Admissions (Excel / CSV)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload official student batch roster to auto-provision accounts, PRNs, and annual fee ledgers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Alert */}
            <div className="mt-4 p-3.5 rounded-2xl bg-zes-50/80 border border-zes-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-zes-800">
                <Download className="w-4 h-4 shrink-0 text-zes-700" />
                <span>Need the official format? Download the pre-formatted Excel template.</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-white text-zes-800 hover:bg-zes-100 font-bold rounded-lg border border-zes-300 shadow-2xs shrink-0 transition"
              >
                Download Template (.xlsx)
              </button>
            </div>

            {/* Error Message */}
            {importError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* Success Summary */}
            {importResult && (
              <div className="mt-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importResult.message}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 font-medium">
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                    <span className="block text-[10px] text-slate-400 uppercase">Processed</span>
                    <span className="text-sm font-bold text-slate-800">{importResult.totalProcessed}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                    <span className="block text-[10px] text-emerald-600 uppercase">Imported</span>
                    <span className="text-sm font-bold text-emerald-700">{importResult.importedCount}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                    <span className="block text-[10px] text-amber-600 uppercase">Skipped / Duplicates</span>
                    <span className="text-sm font-bold text-amber-700">{importResult.skippedCount}</span>
                  </div>
                </div>

                {importResult.skipped && importResult.skipped.length > 0 && (
                  <div className="mt-2 text-[11px] text-slate-600 max-h-24 overflow-y-auto">
                    <p className="font-bold text-amber-800 mb-1">Skipped entries:</p>
                    {importResult.skipped.map((s: any, idx: number) => (
                      <div key={idx} className="text-slate-500">
                        Row {s.row}: {s.prn || s.email} - {s.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upload Area */}
            <form onSubmit={handleBulkImportSubmit} className="mt-5 space-y-4">
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

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-zes-500 hover:bg-zes-50/30 rounded-2xl p-6 text-center cursor-pointer transition group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-zes-100 text-slate-500 group-hover:text-zes-700 flex items-center justify-center mx-auto mb-3 transition">
                  <FileUp className="w-6 h-6" />
                </div>
                {importFile ? (
                  <div>
                    <p className="text-xs font-bold text-slate-900">{importFile.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {(importFile.size / 1024).toFixed(1)} KB • Ready to upload
                    </p>
                    <span className="inline-block mt-2 text-[11px] text-zes-700 font-semibold hover:underline">
                      Click to choose another file
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to select or drag and drop Excel/CSV file
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Supports .xlsx, .xls, and .csv with columns: PRN, RollNumber, FirstName, LastName, Email, DepartmentCode, etc.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Accounts will be created with default password <code className="font-mono text-slate-600">Student@123</code>
                </span>
                <div className="flex items-center space-x-2.5">
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
                    className="px-5 py-2 bg-gradient-to-r from-zes-800 to-zes-700 hover:from-zes-900 hover:to-zes-800 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {importing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importing Records...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Process &amp; Insert Real Data</span>
                      </>
                    )}
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
