import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  Activity,
  Check,
  RotateCcw,
  Building2,
  Clock,
  ShieldCheck,
  BookOpen,
  DollarSign,
  Library,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'ALL'>('ALL');
  const [selectedSection, setSelectedSection] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Password Reveal & Copy state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reset Password Modal state
  const [resetModalStudent, setResetModalStudent] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('Student@123');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Student Activity Drawer/Modal state
  const [activityStudent, setActivityStudent] = useState<any | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [studentActivityData, setStudentActivityData] = useState<any | null>(null);

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

  // Admission Form states
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
  const isManagement =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchStudents = () => {
    setLoading(true);
    const params: any = {};
    if (search.trim()) params.search = search.trim();
    if (selectedDept) params.departmentId = selectedDept;
    if (selectedSemester !== 'ALL') params.semester = selectedSemester;
    if (selectedSection) params.sectionId = selectedSection;

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

  // Re-fetch when department, semester, or section filter changes
  useEffect(() => {
    fetchStudents();
  }, [selectedDept, selectedSemester, selectedSection]);

  // Compute breakdown counts across branches and semesters
  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const code = s.department?.code || 'UNKNOWN';
      counts[code] = (counts[code] || 0) + 1;
    });
    return counts;
  }, [students]);

  const semesterCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    students.forEach((s) => {
      const sem = s.currentSemester || 1;
      counts[sem] = (counts[sem] || 0) + 1;
    });
    return counts;
  }, [students]);

  const togglePasswordVisibility = (studentId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(identifier);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openResetPasswordModal = (student: any) => {
    setResetModalStudent(student);
    setNewPasswordInput('Student@123');
    setResetSuccessMessage(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStudent) return;
    setResettingPassword(true);
    try {
      const res = await apiClient.post(`/students/${resetModalStudent.id}/reset-password`, {
        newPassword: newPasswordInput.trim() || 'Student@123',
      });
      setResetSuccessMessage(res.data.message || 'Password successfully reset.');
      fetchStudents();
      setTimeout(() => {
        setResetModalStudent(null);
        setResetSuccessMessage(null);
      }, 1800);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const openStudentActivity = async (student: any) => {
    setActivityStudent(student);
    setActivityLoading(true);
    setStudentActivityData(null);
    try {
      const res = await apiClient.get(`/students/${student.id}/activity`);
      setStudentActivityData(res.data.data);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

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
          setImportError(
            postErr.response?.data?.message ||
              'Bulk import failed. Please check spreadsheet format.'
          );
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
      {/* 1. Page Header & Management Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Student Directory &amp; Credentials</h1>
            {isManagement && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Management Oversight Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Separated branch cohorts, semester progression, login credentials, and student activity logs (Induri Campus)
          </p>
        </div>

        {isManagement && (
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
              <span>Bulk Import</span>
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

      {/* 2. Branch / Department Separation Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Select Branch / Department:</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total Students Loaded: <strong className="text-slate-800">{students.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedDept('')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
              selectedDept === ''
                ? 'bg-zes-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>All Branches</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedDept === '' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {students.length}
            </span>
          </button>

          {departments.map((d) => {
            const isSelected = selectedDept === d.id;
            const count = branchCounts[d.code] || 0;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDept(d.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{d.code}</span>
                <span className="text-[11px] font-normal opacity-80">({d.name})</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Semester Separation Navigation */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 shrink-0">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Semester Cohort:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedSemester('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              selectedSemester === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All Semesters
          </button>

          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
            const isSelected = selectedSemester === sem;
            const count = semesterCounts[sem] || 0;
            return (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>Sem {sem}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1 py-0.1 rounded-full font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Search & Quick Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, ZPRN, or institutional login email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Apply Filter
          </button>
          {(selectedDept || selectedSemester !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedDept('');
                setSelectedSemester('ALL');
                setSelectedSection('');
                setSearch('');
              }}
              className="px-3 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Students & Management Credentials Oversight Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <UserCheck className="w-4 h-4 text-zes-700" />
            <span>
              Enrolled Students ({students.length}) &bull;{' '}
              {selectedSemester === 'ALL' ? 'All Semesters' : `Semester ${selectedSemester}`}{' '}
              &bull; {selectedDept ? 'Filtered Branch' : 'All Branches'}
            </span>
          </div>

          {isManagement && (
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Credentials &amp; Activity Stream Decrypted for Management</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student &amp; ZPRN</th>
                <th className="py-3 px-4">Branch &amp; Cohort</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Login Email (Account)</th>
                {isManagement && <th className="py-3 px-4">Password &amp; Oversight</th>}
                <th className="py-3 px-4">Activity &amp; Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isManagement ? 7 : 6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading separated student records &amp; login credentials...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={isManagement ? 7 : 6} className="py-12 text-center text-slate-400">
                    No students found matching the selected branch, semester, or search filter.
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const userAcc = s.user;
                  const passwordRevealed = revealedPasswords[s.id];
                  const passwordValue = userAcc?.managedPassword || 'Student@123';
                  const hasLoggedIn = !!userAcc?.lastLoginAt;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      {/* 1. Student & ZPRN */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {s.firstName} {s.lastName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-slate-500">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                            {s.enrollmentNumber}
                          </span>
                          <span>&bull;</span>
                          <span className="font-semibold text-slate-700">{s.rollNumber}</span>
                        </div>
                      </td>

                      {/* 2. Branch & Cohort */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {s.department?.code}
                          </span>
                          <span className="text-slate-700 font-medium truncate max-w-[150px]">
                            {s.department?.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {s.batch?.name} {s.section?.name ? `(${s.section.name})` : ''}
                        </div>
                      </td>

                      {/* 3. Semester */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Semester {s.currentSemester}
                        </span>
                      </td>

                      {/* 4. Login Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-medium text-slate-800 font-mono text-[11px]">
                            {userAcc?.email || s.email}
                          </span>
                          <button
                            onClick={() => copyToClipboard(userAcc?.email || s.email, `email-${s.id}`)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                            title="Copy student login email"
                          >
                            {copiedId === `email-${s.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          PRN &amp; Roll Number also supported for login
                        </div>
                      </td>

                      {/* 5. Password & Management Oversight */}
                      {isManagement && (
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {passwordRevealed ? passwordValue : '••••••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(s.id)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                              title={passwordRevealed ? 'Hide password' : 'Show student password'}
                            >
                              {passwordRevealed ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(passwordValue, `pwd-${s.id}`)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                              title="Copy password to clipboard"
                            >
                              {copiedId === `pwd-${s.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => openResetPasswordModal(s)}
                              className="p-1 hover:bg-amber-50 rounded text-amber-600 hover:text-amber-800 transition"
                              title="Reset student password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {userAcc?.managedPassword ? 'Active Managed Credential' : 'Default Student@123'}
                          </div>
                        </td>
                      )}

                      {/* 6. Activity & Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              hasLoggedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`}
                          />
                          <span className="font-medium text-slate-800 text-[11px]">
                            {hasLoggedIn
                              ? `Logged in ${new Date(userAcc.lastLoginAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}`
                              : 'No login recorded'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span>Logins: {userAcc?.loginCount || 0}</span>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-semibold">{s.academicStatus}</span>
                        </div>
                      </td>

                      {/* 7. Action: Activity Inspector */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openStudentActivity(s)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-indigo-200"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Activity</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Reset Password (Management Action) */}
      {resetModalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset Student Password</h3>
                  <p className="text-[11px] text-slate-500">
                    {resetModalStudent.firstName} {resetModalStudent.lastName} ({resetModalStudent.enrollmentNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccessMessage ? (
              <div className="my-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900">{resetSuccessMessage}</p>
                <p className="text-[11px] text-slate-600">
                  New Password: <strong className="font-mono text-emerald-800">{newPasswordInput}</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 my-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Login Email
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={resetModalStudent.user?.email || resetModalStudent.email}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign New Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="e.g. Student@123"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPasswordInput('Student@123')}
                      className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold shrink-0"
                    >
                      Default
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    The student can immediately log in with this password along with their Email, PRN, or Roll Number.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResetModalStudent(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {resettingPassword ? 'Updating...' : 'Confirm Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: Student Activity & Credential Inspector */}
      {activityStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg">
                  {activityStudent.firstName[0]}
                  {activityStudent.lastName[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activityStudent.firstName} {activityStudent.lastName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                    <span>ZPRN: {activityStudent.enrollmentNumber}</span>
                    <span>&bull;</span>
                    <span>Roll: {activityStudent.rollNumber}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActivityStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activityLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading student activity &amp; audit history...</span>
              </div>
            ) : studentActivityData ? (
              <div className="space-y-5 my-4">
                {/* Credentials Panel */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Institutional Login Credentials
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Account {studentActivityData.user?.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Primary Login Email:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {studentActivityData.user?.email || studentActivityData.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Current Managed Password:</span>
                      <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                        {studentActivityData.user?.managedPassword || 'Student@123'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Total Logins: <strong>{studentActivityData.user?.loginCount || 0}</strong>
                    </span>
                    <span>
                      Last Login:{' '}
                      <strong>
                        {studentActivityData.user?.lastLoginAt
                          ? new Date(studentActivityData.user.lastLoginAt).toLocaleString()
                          : 'Never logged in'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Academic Cohort */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Branch</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {studentActivityData.department?.code}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Semester</span>
                    <span className="font-bold text-emerald-700 text-xs">
                      Sem {studentActivityData.currentSemester}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Batch</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {studentActivityData.batch?.name || '2024-28'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Section</span>
                    <span className="font-bold text-indigo-700 text-xs">
                      {studentActivityData.section?.name || 'Division A'}
                    </span>
                  </div>
                </div>

                {/* Recent Attendance Activity */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Recent Attendance Activity
                  </h4>
                  {studentActivityData.attendanceRecords?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No attendance records yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {studentActivityData.attendanceRecords.slice(0, 5).map((att: any) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs"
                        >
                          <span className="font-medium text-slate-800">
                            {att.lectureSession?.subject?.name || 'Lecture'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              att.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {att.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit History */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Security &amp; Login Audit Trail
                  </h4>
                  {studentActivityData.user?.auditLogs?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No recent security events logged.</p>
                  ) : (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {studentActivityData.user?.auditLogs.map((log: any) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-slate-700"
                        >
                          <span>{log.action} - {log.module}</span>
                          <span className="text-slate-400">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActivityStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

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
