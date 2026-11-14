import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  GraduationCap, Plus, Search, Eye, EyeOff, Copy, Check,
  KeyRound, FileSpreadsheet, Sliders, Download, Users,
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
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetModalStudent, setResetModalStudent] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('Student@123');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showZprnModal, setShowZprnModal] = useState(false);
  const [zprnConfig, setZprnConfig] = useState<any>(null);
  const [zprnPrefix, setZprnPrefix] = useState('ZPRN');
  const [zprnStartNum, setZprnStartNum] = useState(240001);
  const [zprnPadding, setZprnPadding] = useState(5);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const isManagement = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchStudents = () => {
    setLoading(true);
    const params: any = {};
    if (search.trim()) params.search = search.trim();
    if (selectedDept) params.departmentId = selectedDept;
    if (selectedSemester !== 'ALL') params.semester = selectedSemester;
    apiClient.get('/students', { params })
      .then((res) => setStudents(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchZprnConfig = () => {
    apiClient.get('/students/zprn-config')
      .then((res) => {
        if (res.data.data) {
          setZprnConfig(res.data.data);
          setZprnPrefix(res.data.data.prefix || 'ZPRN');
          setZprnStartNum(res.data.data.startNumber || 240001);
          setZprnPadding(res.data.data.padding || 5);
        }
      }).catch(() => {});
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
          if (res.data.data[0].programs[0].batches?.length > 0) setBatchId(res.data.data[0].programs[0].batches[0].id);
        }
      }
    });
  }, []);

  useEffect(() => {
    setSelectedBatch('ALL');
    fetchStudents();
  }, [selectedDept, selectedSemester]);

  const branchCounts = useMemo(() => {
    const c: Record<string, number> = {};
    students.forEach((s) => { const code = s.department?.code || 'UNKNOWN'; c[code] = (c[code] || 0) + 1; });
    return c;
  }, [students]);

  const semesterCounts = useMemo(() => {
    const c: Record<number, number> = {};
    students.forEach((s) => { const sem = s.currentSemester || 1; c[sem] = (c[sem] || 0) + 1; });
    return c;
  }, [students]);

  // Batches available for current branch filter (for sub-filter tabs)
  const availableBatches = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; count: number }>();
    students.forEach((s) => {
      if (s.batch?.id) {
        if (!seen.has(s.batch.id)) seen.set(s.batch.id, { id: s.batch.id, name: s.batch.name, count: 0 });
        seen.get(s.batch.id)!.count += 1;
      }
    });
    return Array.from(seen.values()).sort((a, b) => b.name.localeCompare(a.name));
  }, [students]);

  // Students after applying batch sub-filter
  const filteredStudents = useMemo(() => {
    if (selectedBatch === 'ALL') return students;
    return students.filter((s) => s.batch?.id === selectedBatch);
  }, [students, selectedBatch]);

  // Group filteredStudents by batch for branch-wise display
  const studentsByBatch = useMemo(() => {
    const groups = new Map<string, { batchName: string; batchYear: string; sections: Map<string, { sectionName: string; students: any[] }> }>();
    filteredStudents.forEach((s) => {
      const batchId = s.batch?.id || 'unknown';
      const batchName = s.batch?.name || 'Unknown Batch';
      const batchYear = s.batch?.academicYear || '';
      const sectionId = s.section?.id || 'no-section';
      const sectionName = s.section?.name || 'No GFM Batch';

      if (!groups.has(batchId)) groups.set(batchId, { batchName, batchYear, sections: new Map() });
      const batchGroup = groups.get(batchId)!;
      if (!batchGroup.sections.has(sectionId)) batchGroup.sections.set(sectionId, { sectionName, students: [] });
      batchGroup.sections.get(sectionId)!.students.push(s);
    });
    return groups;
  }, [filteredStudents]);

  const togglePasswordVisibility = (id: string) => setRevealedPasswords((p) => ({ ...p, [id]: !p[id] }));

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStudent) return;
    setResettingPassword(true);
    try {
      const res = await apiClient.post(`/students/${resetModalStudent.id}/reset-password`, { newPassword: newPasswordInput.trim() || 'Student@123' });
      alert(res.data.message || 'Password reset.');
      fetchStudents();
      setResetModalStudent(null);
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
    finally { setResettingPassword(false); }
  };

  const handleDeptSelectChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    const d = departments.find((d) => d.id === newDeptId);
    if (d?.programs?.length > 0) {
      setProgramId(d.programs[0].id);
      setBatchId(d.programs[0].batches?.[0]?.id || '');
    }
  };

  const handleProgramSelectChange = (newProgId: string) => {
    setProgramId(newProgId);
    const d = departments.find((d) => d.id === departmentId);
    const p = d?.programs?.find((p: any) => p.id === newProgId);
    setBatchId(p?.batches?.[0]?.id || '');
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/students/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.setAttribute('download', 'students_import_template.xlsx');
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err: any) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) { setImportError('Select a file first.'); return; }
    setImporting(true); setImportError(null); setImportResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const response = await apiClient.post('/students/bulk-import', { fileBase64: base64Data });
          setImportResult(response.data); fetchStudents();
        } catch (postErr: any) { setImportError(postErr.response?.data?.message || 'Import failed.'); }
        finally { setImporting(false); }
      };
      reader.onerror = () => { setImportError('Failed to read file.'); setImporting(false); };
      reader.readAsDataURL(importFile);
    } catch (err: any) { setImportError(err.message); setImporting(false); }
  };

  const handleAdmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { firstName, lastName, email, phone, dateOfBirth: dob, gender, departmentId, programId, batchId, currentSemester: Number(currentSemester) };
      if (customEnrollmentNumber.trim()) payload.enrollmentNumber = customEnrollmentNumber.trim().toUpperCase();
      const res = await apiClient.post('/students', payload);
      setShowModal(false); setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setCustomEnrollmentNumber('');
      fetchStudents(); fetchZprnConfig();
      alert(res.data.message || 'Student admitted! Default password: Student@123');
    } catch (err: any) { alert(err.response?.data?.message || 'Admission failed.'); }
  };

  const handleSaveZprnConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.put('/students/zprn-config', { prefix: zprnPrefix.trim().toUpperCase(), startNumber: Number(zprnStartNum), padding: Number(zprnPadding) });
      alert(res.data.message || 'ZPRN updated!'); setShowZprnModal(false); fetchZprnConfig();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const currentDept = departments.find((d) => d.id === departmentId);
  const currentPrograms = currentDept?.programs || [];
  const currentProg = currentPrograms.find((p: any) => p.id === programId);
  const currentBatches = currentProg?.batches || [];

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';
  const btnPrimary = 'px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition';
  const btnSecondary = 'px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition';

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Student Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Enrolled students, credentials and activity</p>
        </div>
        {isManagement && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { fetchZprnConfig(); setShowZprnModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition">
              <Sliders className="w-3.5 h-3.5" />
              <span>ZPRN</span>
              {zprnConfig && (
                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {zprnConfig.nextZprn}
                </span>
              )}
            </button>
            <button onClick={() => { setShowImportModal(true); setImportResult(null); setImportError(null); setImportFile(null); }} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Bulk Import
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">
              <Plus className="w-3.5 h-3.5" /> Admit Student
            </button>
          </div>
        )}
      </div>

      {/* Branch filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setSelectedDept(''); setSelectedBatch('ALL'); }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${selectedDept === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            All ({students.length})
          </button>
          {departments.map((d) => {
            const count = students.filter((s) => s.department?.id === d.id).length;
            return (
              <button
                key={d.id}
                onClick={() => { setSelectedDept(d.id); setSelectedBatch('ALL'); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${selectedDept === d.id ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                {d.code} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch sub-filter (only when a branch is selected and multiple batches exist) */}
      {selectedDept && availableBatches.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Batch</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedBatch('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${selectedBatch === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              All Batches ({students.length})
            </button>
            {availableBatches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatch(b.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${selectedBatch === b.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                {b.name} ({b.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Semester filter */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setSelectedSemester('ALL')} className={`px-3 py-1 rounded-lg text-xs font-medium transition ${selectedSemester === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>All Sems</button>
        {[1,2,3,4,5,6,7,8].map((sem) => {
          const semCount = filteredStudents.filter((s) => s.currentSemester === sem).length;
          return (
            <button key={sem} onClick={() => setSelectedSemester(sem)} className={`px-3 py-1 rounded-lg text-xs font-medium transition ${selectedSemester === sem ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              Sem {sem} {semCount > 0 ? `(${semCount})` : ''}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchStudents()} placeholder="Search by name, roll number, ZPRN, email..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <button onClick={fetchStudents} className="px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">Search</button>
      </div>

      {/* Student list — grouped by batch → GFM section when branch is selected, flat otherwise */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-slate-400 text-xs">Loading...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-slate-400 text-xs">No students found.</div>
      ) : selectedDept ? (
        // Branch selected → grouped view: batch → GFM section
        Array.from(studentsByBatch.entries()).map(([batchId, batchGroup]) => (
          <div key={batchId} className="space-y-3">
            {/* Batch header */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-slate-700">{batchGroup.batchName}</span>
              {batchGroup.batchYear && <span className="text-[10px] text-slate-400 font-medium">({batchGroup.batchYear})</span>}
              <span className="text-[10px] text-slate-400 ml-1">
                · {Array.from(batchGroup.sections.values()).reduce((sum, sec) => sum + sec.students.length, 0)} students
              </span>
            </div>

            {Array.from(batchGroup.sections.entries()).map(([sectionId, sectionGroup]) => (
              <div key={sectionId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* GFM section sub-header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-700">{sectionGroup.sectionName}</span>
                  <span className="text-[10px] text-indigo-400 font-medium ml-auto">{sectionGroup.students.length} students</span>
                </div>
                <StudentTable students={sectionGroup.students} isManagement={isManagement} revealedPasswords={revealedPasswords} copiedId={copiedId} togglePasswordVisibility={togglePasswordVisibility} copyToClipboard={copyToClipboard} setResetModalStudent={setResetModalStudent} setNewPasswordInput={setNewPasswordInput} />
              </div>
            ))}
          </div>
        ))
      ) : (
        // No branch selected → flat list grouped by branch
        (() => {
          const byDept = new Map<string, { deptCode: string; deptName: string; students: any[] }>();
          filteredStudents.forEach((s) => {
            const deptId = s.department?.id || 'unknown';
            if (!byDept.has(deptId)) byDept.set(deptId, { deptCode: s.department?.code || 'N/A', deptName: s.department?.name || '', students: [] });
            byDept.get(deptId)!.students.push(s);
          });
          return Array.from(byDept.entries()).map(([deptId, deptGroup]) => (
            <div key={deptId} className="space-y-2">
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-slate-700">{deptGroup.deptCode}</span>
                <span className="text-[10px] text-slate-400">{deptGroup.deptName}</span>
                <span className="text-[10px] text-slate-400 ml-1">· {deptGroup.students.length} students</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <StudentTable students={deptGroup.students} isManagement={isManagement} revealedPasswords={revealedPasswords} copiedId={copiedId} togglePasswordVisibility={togglePasswordVisibility} copyToClipboard={copyToClipboard} setResetModalStudent={setResetModalStudent} setNewPasswordInput={setNewPasswordInput} />
              </div>
            </div>
          ));
        })()
      )}

      {/* Admit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Admit Student</h3>
            <form onSubmit={handleAdmitStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">First Name</label><input className={inputCls} required value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label><input className={inputCls} required value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Email</label><input type="email" className={inputCls} required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Phone</label><input className={inputCls} required value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth</label><input type="date" className={inputCls} value={dob} onChange={(e) => setDob(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Gender</label><select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Department</label><select className={inputCls} value={departmentId} onChange={(e) => handleDeptSelectChange(e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Program</label><select className={inputCls} value={programId} onChange={(e) => handleProgramSelectChange(e.target.value)}>{currentPrograms.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Batch</label><select className={inputCls} value={batchId} onChange={(e) => setBatchId(e.target.value)}>{currentBatches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Semester</label><input type="number" className={inputCls} min={1} max={8} value={currentSemester} onChange={(e) => setCurrentSemester(Number(e.target.value))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Custom ZPRN (optional)</label><input className={inputCls} value={customEnrollmentNumber} onChange={(e) => setCustomEnrollmentNumber(e.target.value)} placeholder="Leave blank for auto-assign" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" className={btnPrimary}>Admit Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalStudent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">{resetModalStudent.firstName} {resetModalStudent.lastName}</p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">New Password</label><input className={inputCls} required value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setResetModalStudent(null)} className={btnSecondary}>Cancel</button>
                <button type="submit" disabled={resettingPassword} className={btnPrimary}>{resettingPassword ? 'Resetting...' : 'Reset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ZPRN Config Modal */}
      {showZprnModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">ZPRN Configuration</h3>
            <form onSubmit={handleSaveZprnConfig} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Prefix</label><input className={inputCls} value={zprnPrefix} onChange={(e) => setZprnPrefix(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Start Number</label><input type="number" className={inputCls} value={zprnStartNum} onChange={(e) => setZprnStartNum(Number(e.target.value))} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Padding</label><input type="number" className={inputCls} min={1} max={10} value={zprnPadding} onChange={(e) => setZprnPadding(Number(e.target.value))} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowZprnModal(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" className={btnPrimary}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Bulk Import Students</h3>
            <p className="text-xs text-slate-500 mb-4">Upload an Excel (.xlsx) or CSV file</p>
            <form onSubmit={handleBulkImportSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition">Choose File</button>
                <span className="text-xs text-slate-500">{importFile ? importFile.name : 'No file chosen'}</span>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setImportFile(e.target.files?.[0] || null); }} className="hidden" />
              </div>
              <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800">
                <Download className="w-3.5 h-3.5" /> Download template
              </button>
              {importError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{importError}</p>}
              {importResult && <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded">{importResult.message}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowImportModal(false)} className={btnSecondary}>Close</button>
                <button type="submit" disabled={importing} className={btnPrimary}>{importing ? 'Importing...' : 'Import'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Reusable table component used by both grouped and flat views
// ---------------------------------------------------------------------------
interface StudentTableProps {
  students: any[];
  isManagement: boolean;
  revealedPasswords: Record<string, boolean>;
  copiedId: string | null;
  togglePasswordVisibility: (id: string) => void;
  copyToClipboard: (text: string, id: string) => void;
  setResetModalStudent: (s: any) => void;
  setNewPasswordInput: (v: string) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  isManagement,
  revealedPasswords,
  copiedId,
  togglePasswordVisibility,
  copyToClipboard,
  setResetModalStudent,
  setNewPasswordInput,
}) => {
  const colSpan = isManagement ? 7 : 5;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-[11px] font-semibold text-slate-500 uppercase">
            <th className="py-3 px-4">Student</th>
            <th className="py-3 px-4">Branch / GFM Batch</th>
            <th className="py-3 px-4">Sem</th>
            <th className="py-3 px-4">Email</th>
            {isManagement && <th className="py-3 px-4">Password</th>}
            <th className="py-3 px-4">Last Login</th>
            {isManagement && <th className="py-3 px-4">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.length === 0 ? (
            <tr><td colSpan={colSpan} className="py-8 text-center text-slate-400">No students.</td></tr>
          ) : students.map((s) => {
            const userAcc = s.user;
            const passwordRevealed = revealedPasswords[s.id];
            const passwordValue = 'Student@123';
            return (
              <tr key={s.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4">
                  <p className="font-semibold text-slate-900">{s.firstName} {s.lastName}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{s.enrollmentNumber} · {s.rollNumber}</p>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{s.department?.code}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.batch?.name}</p>
                  {s.section?.name && (
                    <span className="inline-block text-[10px] font-medium bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded mt-0.5">
                      {s.section.name}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="text-[11px] font-semibold text-slate-700">Sem {s.currentSemester}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[11px] text-slate-700">{userAcc?.email || s.email}</span>
                    <button onClick={() => copyToClipboard(userAcc?.email || s.email, `email-${s.id}`)} className="p-0.5 text-slate-400 hover:text-slate-700">
                      {copiedId === `email-${s.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </td>
                {isManagement && (
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">{passwordRevealed ? passwordValue : '••••••••'}</span>
                      <button onClick={() => togglePasswordVisibility(s.id)} className="p-0.5 text-slate-400 hover:text-slate-700">
                        {passwordRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button onClick={() => copyToClipboard(passwordValue, `pwd-${s.id}`)} className="p-0.5 text-slate-400 hover:text-slate-700">
                        {copiedId === `pwd-${s.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                )}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${userAcc?.lastLoginAt ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[11px] text-slate-500">{userAcc?.lastLoginAt ? new Date(userAcc.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                  </div>
                </td>
                {isManagement && (
                  <td className="py-3 px-4">
                    <button onClick={() => { setResetModalStudent(s); setNewPasswordInput('Student@123'); }} className="p-1 text-amber-600 hover:bg-amber-50 rounded transition" title="Reset password">
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
