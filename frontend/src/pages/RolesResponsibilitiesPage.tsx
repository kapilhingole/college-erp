import React, { useEffect, useState } from 'react';
import { Search, Filter, Download, Upload, Eye, Trash2, Edit2, ExternalLink, Table, FileSpreadsheet, X } from 'lucide-react';
import { apiClient, API_BASE_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface RoleResponsibility {
  id: string; sheetNo?: string; reportNo: string; title: string; section: string;
  frequency: 'Monthly' | 'Semester' | 'Yearly'; hyperlink?: string; filledBy: string;
  assignedFaculty?: string; verifiedBy?: string; department: string;
  academicYear?: string; status: string; remarks?: string;
}
interface MonthlySubmission {
  id: string; reportNo: string; reportTitle: string; docNumber?: string; campus: string;
  reportMonth: string; reportPeriod?: string; department: string; totalEntries: number; status: string; createdAt: string;
}
interface MonthlySubmissionDetail extends MonthlySubmission {
  columns: string[];
  entries: { id: string; srNo: number; data: Record<string, string>; createdAt: string }[];
}
interface StatsData {
  totalFormats: number; monthlyCount: number; semesterCount: number; yearlyCount: number;
  assignedCount: number; unassignedCount: number; sectionCounts: Record<string, number>;
}

export const RolesResponsibilitiesPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const [activeTab, setActiveTab] = useState<'MATRIX' | 'SUBMISSIONS'>('MATRIX');
  const [items, setItems] = useState<RoleResponsibility[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');

  const [submissions, setSubmissions] = useState<MonthlySubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<MonthlySubmissionDetail | null>(null);
  const [loadingSubmissionDetail, setLoadingSubmissionDetail] = useState(false);
  const [entrySearch, setEntrySearch] = useState('');
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [newEntryData, setNewEntryData] = useState<Record<string, string>>({});
  const [savingEntry, setSavingEntry] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  const [editingItem, setEditingItem] = useState<RoleResponsibility | null>(null);
  const [assigneeName, setAssigneeName] = useState('');
  const [verifierName, setVerifierName] = useState('');
  const [hyperlinkUrl, setHyperlinkUrl] = useState('');
  const [statusVal, setStatusVal] = useState('CONFIGURED');
  const [savingEdit, setSavingEdit] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sectionsList = ['ALL', 'ACADEMIC ACTIVITY', 'GFM ACTIVITY', 'ACCREDITATION ACTIVITY', 'PORTFOLIO', 'CO- CURRICULAR ACTIVITY', 'TRAINING & PLACEMENT ACTIVITY', 'ADMINISTRATIVE ACTIVITY', 'ANTI RAGGING/ GRIEVANCE REDRESSAL ACTIVITY', 'SKILL DEVELOPMENT ACTIVITY', 'EXAM ACTIVITY', 'ASSESSMENT', 'FEEDBACK ACTIVITY', 'RECRUITMENT/ STAFF SELECTION', 'III ACTIVITY', 'EXTRA CURRICULAR ACTIVITY', 'PUBLICATION', 'TARGET RESULT', 'RESULT ANALYSIS'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        apiClient.get('/responsibilities', { params: { frequency: selectedFrequency !== 'ALL' ? selectedFrequency : undefined, section: selectedSection !== 'ALL' ? selectedSection : undefined, search: searchQuery.trim() || undefined } }),
        apiClient.get('/responsibilities/stats'),
      ]);
      if (listRes.data.success) setItems(listRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await apiClient.get('/responsibilities/submissions');
      if (res.data.success) setSubmissions(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoadingSubmissions(false); }
  };

  const openSubmissionDetail = async (id: string) => {
    try {
      setLoadingSubmissionDetail(true);
      const res = await apiClient.get(`/responsibilities/submissions/${id}`);
      if (res.data.success) { setSelectedSubmission(res.data.data); setEntrySearch(''); }
    } catch (err) { alert('Could not load submission details'); }
    finally { setLoadingSubmissionDetail(false); }
  };

  const openSubmissionByReportNo = async (reportNo: string) => {
    try {
      setLoadingSubmissionDetail(true);
      const res = await apiClient.get(`/responsibilities/submissions/by-report/${encodeURIComponent(reportNo)}`);
      if (res.data.success) { setSelectedSubmission(res.data.data); setEntrySearch(''); }
      else alert(`No data found for ${reportNo}`);
    } catch { alert(`No data found for ${reportNo}`); }
    finally { setLoadingSubmissionDetail(false); }
  };

  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    try {
      setSavingEntry(true);
      const res = await apiClient.post(`/responsibilities/submissions/${selectedSubmission.id}/entries`, { rowData: newEntryData });
      if (res.data.success) { setShowAddEntryModal(false); setNewEntryData({}); await openSubmissionDetail(selectedSubmission.id); fetchSubmissions(); fetchData(); }
    } catch (err: any) { alert(err.response?.data?.message || 'Failed to save entry'); }
    finally { setSavingEntry(false); }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedSubmission || !window.confirm('Delete this record?')) return;
    try {
      const res = await apiClient.delete(`/responsibilities/submissions/${selectedSubmission.id}/entries/${entryId}`);
      if (res.data.success) { await openSubmissionDetail(selectedSubmission.id); fetchSubmissions(); fetchData(); }
    } catch { alert('Failed to delete entry'); }
  };

  const openEditModal = (item: RoleResponsibility) => {
    setEditingItem(item); setAssigneeName(item.assignedFaculty || ''); setVerifierName(item.verifiedBy || '');
    setHyperlinkUrl(item.hyperlink || ''); setStatusVal(item.status || 'CONFIGURED');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setSavingEdit(true);
      const res = await apiClient.put(`/responsibilities/${editingItem.id}`, { assignedFaculty: assigneeName.trim(), verifiedBy: verifierName.trim(), hyperlink: hyperlinkUrl.trim(), status: statusVal });
      if (res.data.success) { setEditingItem(null); fetchData(); }
    } catch { alert('Failed to save.'); }
    finally { setSavingEdit(false); }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('erp_token');
    window.open(`${API_BASE_URL}/responsibilities/export?token=${token}`, '_blank');
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) { setImportMessage({ type: 'error', text: 'Paste CSV content first.' }); return; }
    try {
      setImporting(true); setImportMessage(null);
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) { setImportMessage({ type: 'error', text: 'Need header + at least one row.' }); return; }
      const parseCSVLine = (text: string) => {
        const re = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        const result: string[] = []; let match;
        while ((match = re.exec(text)) !== null) {
          let val = match[1];
          if (val && val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1).replace(/""/g, '"');
          result.push((val || '').trim());
          if (match.index === re.lastIndex) re.lastIndex++;
        }
        return result.slice(0, -1);
      };
      const headers = parseCSVLine(lines[0]);
      const itemsToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim(); if (!line) continue;
        const cols = parseCSVLine(line); if (cols.length < 3) continue;
        const row: any = {}; headers.forEach((h, idx) => { if (h && cols[idx] !== undefined) row[h] = cols[idx]; });
        const reportNo = row['Report No.'] || cols[2] || ''; const title = row['Title of Format'] || cols[3] || '';
        if (reportNo && title) itemsToImport.push({ sheetNo: row['Sr. No. / Sheet No.'] || cols[1] || '', reportNo, title, section: row['Section'] || cols[4] || 'ACADEMIC ACTIVITY', frequency: row['Frequency'] || cols[5] || 'Monthly', hyperlink: row['Hyperlink for the Format'] || cols[6] || '', filledBy: row['Report to be filled by'] || cols[7] || 'Faculty', assignedFaculty: row['Assigned Faculty'] || cols[8] || '', verifiedBy: row['Report to be Verified and Reviewed by'] || cols[9] || '' });
      }
      if (itemsToImport.length === 0) { setImportMessage({ type: 'error', text: 'No valid rows found.' }); return; }
      const res = await apiClient.post('/responsibilities/bulk-import', { items: itemsToImport });
      if (res.data.success) {
        setImportMessage({ type: 'success', text: res.data.message });
        setTimeout(() => { setShowImportModal(false); setCsvText(''); setImportMessage(null); fetchData(); }, 1500);
      }
    } catch (err: any) { setImportMessage({ type: 'error', text: err.response?.data?.message || 'Import failed.' }); }
    finally { setImporting(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setCsvText(event.target?.result as string);
    reader.readAsText(file);
  };

  const downloadEntriesCsv = () => {
    if (!selectedSubmission?.entries) return;
    const cols = selectedSubmission.columns || [];
    let csvStr = cols.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(',') + '\n';
    selectedSubmission.entries.forEach((e: any) => {
      csvStr += cols.map((col: string) => `"${(e.data[col] !== undefined ? String(e.data[col]) : '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.setAttribute('download', `${selectedSubmission.reportNo.replace(/\s+/g, '_')}_${selectedSubmission.reportMonth}_Data.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  useEffect(() => { fetchData(); fetchSubmissions(); }, [selectedFrequency, selectedSection]);

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';
  const btnPrimary = 'px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition';
  const btnSecondary = 'px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition';
  const freqBadge = (f: string) => f === 'Monthly' ? 'bg-blue-100 text-blue-700' : f === 'Semester' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Roles & Responsibilities</h1>
          <p className="text-xs text-slate-500 mt-0.5">Institutional compliance matrix — {stats?.totalFormats || items.length} formats</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"><Download className="w-3.5 h-3.5" />Export CSV</button>
          {isSuperAdmin && <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"><Upload className="w-3.5 h-3.5" />Bulk Import</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Formats', value: stats?.totalFormats || items.length },
          { label: 'Monthly', value: stats?.monthlyCount || 0 },
          { label: 'Semester', value: stats?.semesterCount || 0 },
          { label: 'Yearly', value: stats?.yearlyCount || 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button onClick={() => setActiveTab('MATRIX')} className={`px-4 py-2 text-xs font-medium border-b-2 transition -mb-px flex items-center gap-1.5 ${activeTab === 'MATRIX' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileSpreadsheet className="w-3.5 h-3.5" />Matrix ({items.length})</button>
        <button onClick={() => { setActiveTab('SUBMISSIONS'); if (submissions.length === 0) fetchSubmissions(); }} className={`px-4 py-2 text-xs font-medium border-b-2 transition -mb-px flex items-center gap-1.5 ${activeTab === 'SUBMISSIONS' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Table className="w-3.5 h-3.5" />Submissions <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{submissions.length}</span></button>
      </div>

      {activeTab === 'MATRIX' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs font-medium">
                {['ALL', 'Monthly', 'Semester', 'Yearly'].map((freq) => (
                  <button key={freq} onClick={() => setSelectedFrequency(freq)} className={`px-3 py-1.5 transition ${selectedFrequency === freq ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{freq}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                  {sectionsList.map((sec) => <option key={sec} value={sec}>{sec === 'ALL' ? 'All Sections' : sec}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData()} placeholder="Search by report code, title, or faculty..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <button onClick={fetchData} className="px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">Search</button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Code</th><th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Section</th><th className="py-2.5 px-4">Freq</th>
                    <th className="py-2.5 px-4">Filled By</th><th className="py-2.5 px-4">Assigned Faculty</th>
                    <th className="py-2.5 px-4">Verified By</th><th className="py-2.5 px-4 text-center">Data</th>
                    {isSuperAdmin && <th className="py-2.5 px-4 text-right">Edit</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={isSuperAdmin ? 9 : 8} className="py-10 text-center text-slate-400">Loading...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={isSuperAdmin ? 9 : 8} className="py-10 text-center text-slate-400">No formats found.</td></tr>
                  ) : items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{item.reportNo}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800 max-w-[200px]">
                        <p className="truncate">{item.title}</p>
                        {item.hyperlink && <a href={item.hyperlink} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 flex items-center gap-0.5 mt-0.5"><ExternalLink className="w-3 h-3" />Template</a>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-[120px] truncate text-[11px]">{item.section}</td>
                      <td className="py-2.5 px-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${freqBadge(item.frequency)}`}>{item.frequency}</span></td>
                      <td className="py-2.5 px-4 text-slate-600">{item.filledBy}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.assignedFaculty || <span className="text-slate-300">—</span>}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.verifiedBy || <span className="text-slate-300">—</span>}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button onClick={() => { openSubmissionByReportNo(item.reportNo); setActiveTab('SUBMISSIONS'); }} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded" title="View data">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-2.5 px-4 text-right">
                          <button onClick={() => openEditModal(item)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded" title="Edit assignment">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Submissions view */
        <div className="space-y-5">
          {!selectedSubmission ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Monthly Submissions ({submissions.length})</p>
                <div className="flex items-center gap-2">
                  <select className="text-xs border border-slate-200 rounded-lg px-2 py-1" value={selectedDeptFilter} onChange={(e) => setSelectedDeptFilter(e.target.value)}>
                    <option value="ALL">All Depts</option>
                    {['Artificial Intelligence and Data Science', 'Computer Engineering', 'Electronic and Telecommunication', 'Electronic and Computer Engineering'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              {loadingSubmissions ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading submissions...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="py-2.5 px-4">Report No.</th><th className="py-2.5 px-4">Title</th>
                        <th className="py-2.5 px-4">Month</th><th className="py-2.5 px-4">Department</th>
                        <th className="py-2.5 px-4">Entries</th><th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissions.filter((s) => selectedDeptFilter === 'ALL' || s.department === selectedDeptFilter).map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{sub.reportNo}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-800 max-w-[200px] truncate">{sub.reportTitle}</td>
                          <td className="py-2.5 px-4 text-slate-600">{sub.reportMonth}</td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-[160px] truncate">{sub.department}</td>
                          <td className="py-2.5 px-4"><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{sub.totalEntries}</span></td>
                          <td className="py-2.5 px-4"><span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{sub.status}</span></td>
                          <td className="py-2.5 px-4">
                            <button onClick={() => openSubmissionDetail(sub.id)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedSubmission(null)} className="text-xs text-slate-500 hover:text-slate-800">← Back</button>
                    <span className="text-slate-300">|</span>
                    <p className="text-sm font-semibold text-slate-800">{selectedSubmission.reportNo} — {selectedSubmission.reportTitle}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedSubmission.reportMonth} · {selectedSubmission.department} · {selectedSubmission.totalEntries} entries</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadEntriesCsv} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"><Download className="w-3.5 h-3.5" />CSV</button>
                  {isSuperAdmin && <button onClick={() => { setNewEntryData({}); setShowAddEntryModal(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">+ Add Row</button>}
                </div>
              </div>

              {/* Search within */}
              <div className="px-5 py-2 border-b border-slate-100">
                <div className="relative max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={entrySearch} onChange={(e) => setEntrySearch(e.target.value)} placeholder="Search entries..." className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>

              {loadingSubmissionDetail ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {selectedSubmission.columns?.map((col) => <th key={col} className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase whitespace-nowrap">{col}</th>)}
                        {isSuperAdmin && <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-slate-500 uppercase">Del</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSubmission.entries?.filter((e) => !entrySearch || Object.values(e.data).some((v) => String(v).toLowerCase().includes(entrySearch.toLowerCase()))).map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          {selectedSubmission.columns?.map((col) => <td key={col} className="py-2.5 px-3 text-slate-700 max-w-[180px] truncate">{entry.data[col] ?? '—'}</td>)}
                          {isSuperAdmin && <td className="py-2.5 px-3 text-center"><button onClick={() => handleDeleteEntry(entry.id)} className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Assign & Update</h3>
            <p className="text-xs text-slate-500 mb-4">{editingItem.reportNo} — {editingItem.title}</p>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Assigned Faculty</label><input className={inputCls} value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Verified By</label><input className={inputCls} value={verifierName} onChange={(e) => setVerifierName(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Template Hyperlink</label><input className={inputCls} value={hyperlinkUrl} onChange={(e) => setHyperlinkUrl(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select className={inputCls} value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                  <option value="CONFIGURED">Configured</option><option value="SUBMITTED">Submitted</option><option value="PENDING">Pending</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditingItem(null)} className={btnSecondary}>Cancel</button><button type="submit" disabled={savingEdit} className={btnPrimary}>{savingEdit ? 'Saving...' : 'Save'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddEntryModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Add Row to {selectedSubmission.reportNo}</h3>
            <form onSubmit={handleSaveManualEntry} className="space-y-3">
              {selectedSubmission.columns?.map((col) => (
                <div key={col}><label className="block text-xs font-medium text-slate-700 mb-1">{col}</label><input className={inputCls} value={newEntryData[col] || ''} onChange={(e) => setNewEntryData((prev) => ({ ...prev, [col]: e.target.value }))} /></div>
              ))}
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowAddEntryModal(false)} className={btnSecondary}>Cancel</button><button type="submit" disabled={savingEntry} className={btnPrimary}>{savingEntry ? 'Saving...' : 'Add Row'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Bulk Import CSV</h3>
              <button onClick={() => { setShowImportModal(false); setCsvText(''); setImportMessage(null); }} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            {importMessage && <div className={`mb-3 p-3 rounded-lg text-xs ${importMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{importMessage.text}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Upload CSV file</label>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="text-xs text-slate-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Or paste CSV content</label>
                <textarea className={inputCls} rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="Paste CSV data here..." />
              </div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setShowImportModal(false); setCsvText(''); setImportMessage(null); }} className={btnSecondary}>Cancel</button><button onClick={handleBulkImport} disabled={importing} className={btnPrimary}>{importing ? 'Importing...' : 'Import'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
