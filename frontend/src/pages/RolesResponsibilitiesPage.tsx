import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  ExternalLink,
  Edit2,
  UserCheck,
  AlertCircle,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  Award,
  Table,
  Eye,
  FileCheck,
  CalendarRange,
  Trash2,
} from 'lucide-react';
import { apiClient, API_BASE_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface RoleResponsibility {
  id: string;
  sheetNo?: string;
  reportNo: string;
  title: string;
  section: string;
  frequency: 'Monthly' | 'Semester' | 'Yearly';
  hyperlink?: string;
  filledBy: string;
  assignedFaculty?: string;
  verifiedBy?: string;
  department: string;
  academicYear?: string;
  status: string;
  remarks?: string;
}

interface MonthlySubmission {
  id: string;
  reportNo: string;
  reportTitle: string;
  docNumber?: string;
  campus: string;
  reportMonth: string;
  reportPeriod?: string;
  department: string;
  totalEntries: number;
  status: string;
  createdAt: string;
}

interface MonthlySubmissionDetail extends MonthlySubmission {
  columns: string[];
  entries: {
    id: string;
    srNo: number;
    data: Record<string, string>;
    createdAt: string;
  }[];
}

interface StatsData {
  totalFormats: number;
  monthlyCount: number;
  semesterCount: number;
  yearlyCount: number;
  assignedCount: number;
  unassignedCount: number;
  sectionCounts: Record<string, number>;
}

export const RolesResponsibilitiesPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const [activeTab, setActiveTab] = useState<'MATRIX' | 'SUBMISSIONS'>('MATRIX');
  const [items, setItems] = useState<RoleResponsibility[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  // Monthly Submissions State
  const [submissions, setSubmissions] = useState<MonthlySubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<MonthlySubmissionDetail | null>(null);
  const [loadingSubmissionDetail, setLoadingSubmissionDetail] = useState(false);
  const [entrySearch, setEntrySearch] = useState('');

  // Manual Data Entry Modal State
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [newEntryData, setNewEntryData] = useState<Record<string, string>>({});
  const [savingEntry, setSavingEntry] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  const OFFICIAL_DEPARTMENTS = [
    'Artificial Intelligence and Data Science',
    'Computer Engineering',
    'Electronic and Telecommunication',
    'Electronic and Computer Engineering',
  ];

  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      setSavingEntry(true);
      const res = await apiClient.post(`/responsibilities/submissions/${selectedSubmission.id}/entries`, {
        rowData: newEntryData,
      });

      if (res.data.success) {
        setShowAddEntryModal(false);
        setNewEntryData({});
        await openSubmissionDetail(selectedSubmission.id);
        fetchSubmissions();
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to save manual entry:', err);
      alert(err.response?.data?.message || 'Failed to save manual entry to database');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedSubmission) return;
    if (!window.confirm('Are you sure you want to delete this record from the database?')) return;

    try {
      const res = await apiClient.delete(`/responsibilities/submissions/${selectedSubmission.id}/entries/${entryId}`);
      if (res.data.success) {
        await openSubmissionDetail(selectedSubmission.id);
        fetchSubmissions();
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      alert('Failed to delete entry from database');
    }
  };

  // Edit / Assign Modal State
  const [editingItem, setEditingItem] = useState<RoleResponsibility | null>(null);
  const [assigneeName, setAssigneeName] = useState('');
  const [verifierName, setVerifierName] = useState('');
  const [hyperlinkUrl, setHyperlinkUrl] = useState('');
  const [statusVal, setStatusVal] = useState('CONFIGURED');
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        apiClient.get('/responsibilities', {
          params: {
            frequency: selectedFrequency !== 'ALL' ? selectedFrequency : undefined,
            section: selectedSection !== 'ALL' ? selectedSection : undefined,
            search: searchQuery.trim() || undefined,
          },
        }),
        apiClient.get('/responsibilities/stats'),
      ]);

      if (listRes.data.success) {
        setItems(listRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load roles and responsibilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await apiClient.get('/responsibilities/submissions');
      if (res.data.success) {
        setSubmissions(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load monthly submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const openSubmissionDetail = async (id: string) => {
    try {
      setLoadingSubmissionDetail(true);
      const res = await apiClient.get(`/responsibilities/submissions/${id}`);
      if (res.data.success) {
        setSelectedSubmission(res.data.data);
        setEntrySearch('');
      }
    } catch (err) {
      console.error('Failed to load submission details:', err);
      alert('Could not load submission details');
    } finally {
      setLoadingSubmissionDetail(false);
    }
  };

  const openSubmissionByReportNo = async (reportNo: string) => {
    try {
      setLoadingSubmissionDetail(true);
      const res = await apiClient.get(`/responsibilities/submissions/by-report/${encodeURIComponent(reportNo)}`);
      if (res.data.success) {
        setSelectedSubmission(res.data.data);
        setEntrySearch('');
      } else {
        alert(`No submitted records found for ${reportNo}`);
      }
    } catch (err: any) {
      alert(`No submitted report data found for ${reportNo}`);
    } finally {
      setLoadingSubmissionDetail(false);
    }
  };

  const downloadEntriesCsv = () => {
    if (!selectedSubmission || !selectedSubmission.entries) return;
    const cols = selectedSubmission.columns || [];
    let csvStr = cols.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(',') + '\n';
    selectedSubmission.entries.forEach((e: any) => {
      const row = cols.map((col: string) => {
        const val = e.data[col] !== undefined ? String(e.data[col]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvStr += row.join(',') + '\n';
    });
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedSubmission.reportNo.replace(/\s+/g, '_')}_${selectedSubmission.reportMonth}_Data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchData();
    fetchSubmissions();
  }, [selectedFrequency, selectedSection]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openEditModal = (item: RoleResponsibility) => {
    setEditingItem(item);
    setAssigneeName(item.assignedFaculty || '');
    setVerifierName(item.verifiedBy || '');
    setHyperlinkUrl(item.hyperlink || '');
    setStatusVal(item.status || 'CONFIGURED');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSavingEdit(true);
      const res = await apiClient.put(`/responsibilities/${editingItem.id}`, {
        assignedFaculty: assigneeName.trim(),
        verifiedBy: verifierName.trim(),
        hyperlink: hyperlinkUrl.trim(),
        status: statusVal,
      });

      if (res.data.success) {
        setEditingItem(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update responsibility:', err);
      alert('Failed to save assignment. Please check permissions.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('erp_token');
    window.open(`${API_BASE_URL}/responsibilities/export?token=${token}`, '_blank');
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) {
      setImportMessage({ type: 'error', text: 'Please paste CSV content or upload a file.' });
      return;
    }

    try {
      setImporting(true);
      setImportMessage(null);

      // Parse CSV rows into objects
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        setImportMessage({ type: 'error', text: 'CSV must have a header row and at least one data row.' });
        return;
      }

      // Simple CSV line parser supporting quoted values
      const parseCSVLine = (text: string) => {
        const re = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        const result: string[] = [];
        let match;
        while ((match = re.exec(text)) !== null) {
          let val = match[1];
          if (val && val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).replace(/""/g, '"');
          }
          result.push((val || '').trim());
          if (match.index === re.lastIndex) re.lastIndex++;
        }
        return result.slice(0, -1);
      };

      const headers = parseCSVLine(lines[0]);
      const itemsToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        if (cols.length < 3) continue;

        // Map column indices or fallback to common layout
        const row: any = {};
        headers.forEach((h, idx) => {
          if (h && cols[idx] !== undefined) {
            row[h] = cols[idx];
          }
        });

        // Normalize expected keys
        const sheetNo = row['Sr. No. / Sheet No.'] || cols[1] || '';
        const reportNo = row['Report No.'] || cols[2] || '';
        const title = row['Title of Format'] || cols[3] || '';
        const section = row['Section'] || cols[4] || 'ACADEMIC ACTIVITY';
        const frequency = row['Frequency'] || cols[5] || 'Monthly';
        const hyperlink = row['Hyperlink for the Format'] || cols[6] || '';
        const filledBy = row['Report to be filled by'] || cols[7] || 'Faculty';
        const assignedFaculty = row['Mechanical Faculty'] || row['Assigned Faculty'] || cols[8] || '';
        const verifiedBy = row['Report to be Verified and Reviewed by'] || cols[9] || '';

        if (reportNo && title) {
          itemsToImport.push({
            sheetNo,
            reportNo,
            title,
            section,
            frequency,
            hyperlink,
            filledBy,
            assignedFaculty,
            verifiedBy,
          });
        }
      }

      if (itemsToImport.length === 0) {
        setImportMessage({ type: 'error', text: 'No valid rows found in provided CSV data.' });
        return;
      }

      const res = await apiClient.post('/responsibilities/bulk-import', {
        items: itemsToImport,
      });

      if (res.data.success) {
        setImportMessage({
          type: 'success',
          text: `Success! ${res.data.message}`,
        });
        setTimeout(() => {
          setShowImportModal(false);
          setCsvText('');
          setImportMessage(null);
          fetchData();
        }, 1500);
      }
    } catch (err: any) {
      setImportMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error importing CSV data.',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  // Distinct sections for dropdown
  const sectionsList = [
    'ALL',
    'ACADEMIC ACTIVITY',
    'GFM ACTIVITY',
    'ACCREDITATION ACTIVITY',
    'PORTFOLIO',
    'CO- CURRICULAR ACTIVITY',
    'TRAINING & PLACEMENT ACTIVITY',
    'ADMINISTRATIVE ACTIVITY',
    'ANTI RAGGING/ GRIEVANCE REDRESSAL ACTIVITY',
    'SKILL DEVELOPMENT ACTIVITY',
    'EXAM ACTIVITY',
    'ASSESSMENT',
    'FEEDBACK ACTIVITY',
    'RECRUITMENT/ STAFF SELECTION',
    'III ACTIVITY',
    'EXTRA CURRICULAR ACTIVITY',
    'PUBLICATION',
    'TARGET RESULT',
    'RESULT ANALYSIS',
  ];

  return (
    <div className="space-y-7 pb-12">
      {/* 1. Header Banner with Official ZES Logo */}
      <div className="bg-gradient-to-r from-zes-950 via-[#102747] to-zes-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-zes-950/30 border border-zes-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-zes-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <img
              src="/zes-logo.png"
              alt="Zeal Education Society"
              className="w-16 h-16 rounded-2xl bg-white p-1.5 object-contain shadow-lg shadow-zes-950/40 border border-zes-300 shrink-0 hidden sm:block"
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-zes-800 text-zes-200 border border-zes-600/70 px-3 py-1 rounded-full shadow-sm">
                  SuperAdmin Governance
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Compliance Matrix Active
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Roles &amp; Responsibilities Matrix
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Zeal Education Society, Induri Campus • Academic Year 2024-25 (AIDS, COMP, ENTC, ECE)
                Statutory academic portfolios, monthly verification formats, semester examinations, and accreditation compliance.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold tracking-wide transition border border-white/20 flex items-center gap-1.5 backdrop-blur-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export Matrix (CSV)
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-zes-600 to-zes-500 hover:from-zes-700 hover:to-zes-600 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-lg shadow-zes-950/40 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Bulk Import / Upload CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top-Tier KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Formats
            </span>
            <div className="w-10 h-10 rounded-xl bg-zes-50 text-zes-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats?.totalFormats || items.length}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">19 Activity Sections</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                Active Standards
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Monthly Formats
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats?.monthlyCount || 15}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Codes M 1 – M 15</span>
              <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                Monthly Cycle
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Semester Formats
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats?.semesterCount || 35}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Codes S1 – S35</span>
              <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60">
                Term I &amp; II
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Yearly Formats
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats?.yearlyCount || 5}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Codes Y1 – Y5</span>
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                Annual Audit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 View Mode Selector */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 pt-2">
        <button
          onClick={() => setActiveTab('MATRIX')}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'MATRIX'
              ? 'border-zes-800 text-zes-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Institutional Roles Matrix ({items.length || 55} Formats)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('SUBMISSIONS');
            if (submissions.length === 0) fetchSubmissions();
          }}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'SUBMISSIONS'
              ? 'border-zes-800 text-zes-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>October 2026 Monthly Submissions</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
            79 Records Ingested
          </span>
        </button>
      </div>

      {activeTab === 'MATRIX' ? (
        <>
          {/* 3. Search, Filter & Tabs Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Frequency Segmented Filter */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200">
                {['ALL', 'Monthly', 'Semester', 'Yearly'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setSelectedFrequency(freq)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedFrequency === freq
                        ? 'bg-white text-zes-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {freq === 'ALL' ? 'All Frequencies' : `${freq} Formats`}
                  </button>
                ))}
              </div>

              {/* Section Filter Dropdown */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                >
                  {sectionsList.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec === 'ALL' ? 'All Sections / Domains' : sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Report No (e.g. M 1, S10), Title, Faculty Coordinator, or Reviewer..."
                className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600 transition-all shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 px-3 py-1 bg-zes-800 text-white rounded-lg text-xs font-bold hover:bg-zes-900 transition"
              >
                Search
              </button>
            </form>
          </div>

          {/* 4. Formats Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-zes-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Assigned Compliance Formats &amp; Portfolios ({items.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Campus: <strong>ZCOER Induri</strong> &bull; 4 Disciplines: <strong>AIDS, COMP, ENTC, ECE</strong>
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <div className="w-8 h-8 border-3 border-zes-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Loading Compliance Matrix...
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 px-4">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No matching compliance formats found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or section filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-20">Code</th>
                      <th className="py-3 px-4">Title of Format</th>
                      <th className="py-3 px-4">Section / Category</th>
                      <th className="py-3 px-4 w-28">Frequency</th>
                      <th className="py-3 px-4">Filled By</th>
                      <th className="py-3 px-4">Assigned Faculty</th>
                      <th className="py-3 px-4">Verified By</th>
                      <th className="py-3 px-4 text-center w-28">Template / Data</th>
                      {isSuperAdmin && <th className="py-3 px-4 text-right w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const freqBadge =
                        item.frequency === 'Monthly'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : item.frequency === 'Semester'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200';

                      const hasSubmittedData = item.status === 'SUBMITTED' || ['M 1', 'M 2', 'M 3', 'M 4', 'M 5'].includes(item.reportNo);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                            <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              {item.reportNo}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 leading-snug">
                              {item.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {item.sheetNo && (
                                <span className="text-[10px] text-slate-400">
                                  Sheet #{item.sheetNo}
                                </span>
                              )}
                              {hasSubmittedData && (
                                <button
                                  type="button"
                                  onClick={() => openSubmissionByReportNo(item.reportNo)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded transition"
                                  title="View Oct 2026 Submitted Data"
                                >
                                  <Eye className="w-3 h-3 text-emerald-600" />
                                  <span>Oct '26 Ingested</span>
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 max-w-[170px] truncate">
                              {item.section}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${freqBadge}`}
                            >
                              {item.frequency}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-700 max-w-[160px]">
                            {item.filledBy}
                          </td>

                          <td className="py-3.5 px-4">
                            {item.assignedFaculty ? (
                              <div className="flex items-center space-x-1.5 font-semibold text-zes-800 bg-zes-50/80 px-2 py-1 rounded-lg border border-zes-200/60 max-w-[200px]">
                                <UserCheck className="w-3.5 h-3.5 text-zes-600 shrink-0" />
                                <span className="truncate">{item.assignedFaculty}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-medium max-w-[160px]">
                            {item.verifiedBy || 'Head of Department'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.hyperlink ? (
                                <a
                                  href={item.hyperlink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-zes-700 hover:text-zes-900 bg-zes-50 hover:bg-zes-100 p-1.5 rounded-lg border border-zes-200 transition"
                                  title="Open Format Template"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </div>
                          </td>

                          {isSuperAdmin && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 text-slate-400 hover:text-zes-700 hover:bg-zes-50 rounded-lg transition"
                                title="Assign Faculty / Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Submissions View (October 2026 Ingested Data) */
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Monthly Report Submissions &bull; October 2026
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Institutional Campus: <strong className="text-zes-800 font-bold">ZCOER Induri</strong> &bull; Period: 01-10-2026 to 31-10-2026 &bull; Disciplines: AIDS, COMP, ENTC, ECE
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold">
                5 Reports Submitted (79 Rows)
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl font-bold">
                Draft Formats Ready
              </span>
            </div>
          </div>

          {loadingSubmissions ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-zes-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Loading Ingested Submissions...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {submissions.map((sub) => {
                const isSubmitted = sub.status === 'SUBMITTED' && sub.totalEntries > 0;
                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                      isSubmitted ? 'border-emerald-200 hover:border-emerald-300' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                          {sub.reportNo}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isSubmitted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isSubmitted ? `✅ ${sub.totalEntries} Entries Ingested` : '📝 Registered Template'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {sub.reportTitle}
                      </h3>

                      <p className="text-[11px] font-mono text-slate-400 mt-1">
                        {sub.docNumber || 'ZEAL/ZCOER/REPORTS'}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                        <div className="flex justify-between">
                          <span>Reporting Month:</span>
                          <strong className="text-slate-800">{sub.reportMonth}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Report Period:</span>
                          <strong className="text-slate-800">{sub.reportPeriod || '01-10-2026 to 31-10-2026'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Campus:</span>
                          <strong className="text-zes-800">{sub.campus}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => openSubmissionDetail(sub.id)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          sub.totalEntries > 0
                            ? 'bg-gradient-to-r from-zes-800 to-zes-700 hover:from-zes-900 hover:to-zes-800 text-white shadow-xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {sub.totalEntries > 0 ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Ingested Data ({sub.totalEntries} Rows)</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Open Template &amp; Add Records</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. EDIT / ASSIGN FACULTY MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-xs bg-zes-100 text-zes-800 px-2 py-0.5 rounded">
                  {editingItem.reportNo}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Assign Responsibility</h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Format Title
                </label>
                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {editingItem.title}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Role Required
                </label>
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {editingItem.filledBy}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Assigned Faculty Member / Coordinator <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="e.g. Prof. Gadhave P.S. or Feedback Coordinator"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Review &amp; Verification Authority
                </label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  placeholder="e.g. Head of Department, Principal/ Director"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Format Hyperlink / Google Drive Template URL
                </label>
                <input
                  type="url"
                  value={hyperlinkUrl}
                  onChange={(e) => setHyperlinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. BULK IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-zes-700" />
                <h3 className="font-bold text-slate-900 text-sm">Bulk Import Roles &amp; Formats</h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportMessage(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <p className="text-xs text-slate-500">
                Upload a CSV file or paste CSV text containing your institutional format columns:
                <code className="block bg-slate-100 p-2 rounded-lg text-[10px] text-slate-700 mt-1 font-mono">
                  Sr. No. / Sheet No., Report No., Title of Format, Section, Frequency, Hyperlink for the Format, Report to be filled by, Mechanical Faculty, Report to be Verified and Reviewed by
                </code>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Option 1: Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zes-50 file:text-zes-800 hover:file:bg-zes-100 border border-slate-200 rounded-xl cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Option 2: Paste Raw CSV Data
                </label>
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Paste your CSV table lines here..."
                  className="w-full text-xs font-mono border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600 bg-slate-50/70"
                />
              </div>

              {importMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    importMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {importMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{importMessage.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportMessage(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing || !csvText.trim()}
                  onClick={handleBulkImport}
                  className="px-5 py-2 bg-gradient-to-r from-zes-800 to-zes-700 hover:from-zes-900 hover:to-zes-800 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{importing ? 'Processing CSV...' : 'Process & Import Data'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DYNAMIC INGESTED REPORT DATA MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-zes-950 via-[#102747] to-zes-900 text-white flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-black bg-white/20 text-white px-2 py-0.5 rounded">
                    {selectedSubmission.reportNo}
                  </span>
                  <span className="text-xs text-zes-300 font-mono">
                    {selectedSubmission.docNumber || 'ZEAL/ZCOER/REPORTS'}
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                    {selectedSubmission.campus}
                  </span>
                  <span className="text-[10px] bg-zes-500/20 text-zes-200 border border-zes-400/40 px-2 py-0.5 rounded-full font-bold">
                    {selectedSubmission.department}
                  </span>
                </div>

                <h2 className="text-base sm:text-xl font-black text-white">
                  {selectedSubmission.reportTitle}
                </h2>

                <p className="text-xs text-slate-300 mt-1">
                  Reporting Month: <strong>{selectedSubmission.reportMonth}</strong> ({selectedSubmission.reportPeriod}) &bull; Total Ingested Rows: <strong>{selectedSubmission.entries?.length || 0}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const initData: Record<string, string> = {};
                    selectedSubmission.columns.forEach((col: string) => {
                      if (col.toLowerCase().includes('department') || col.toLowerCase() === 'dept') {
                        initData[col] = 'Computer Engineering';
                      } else if (col.toLowerCase().includes('status')) {
                        initData[col] = 'Complete';
                      } else {
                        initData[col] = '';
                      }
                    });
                    setNewEntryData(initData);
                    setShowAddEntryModal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/20"
                  title="Add Record Manually"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Record Manually</span>
                </button>

                <button
                  onClick={downloadEntriesCsv}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20 backdrop-blur-xs"
                  title="Download CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter / Search inside entries */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={entrySearch}
                  onChange={(e) => setEntrySearch(e.target.value)}
                  placeholder="Search within columns (faculty, subject, student, status)..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                />
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                Showing {
                  selectedSubmission.entries.filter((entry) => {
                    if (!entrySearch.trim()) return true;
                    const q = entrySearch.toLowerCase();
                    return Object.values(entry.data || {}).some((v) => String(v).toLowerCase().includes(q));
                  }).length
                } of {selectedSubmission.entries.length} records
              </div>
            </div>

            {/* Table of Entries */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {selectedSubmission.entries.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Table className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">No records saved yet for this report format.</p>
                    <p className="text-xs text-slate-400 mt-1">Columns are registered and ready for manual data entry.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const initData: Record<string, string> = {};
                      selectedSubmission.columns.forEach((col: string) => {
                        if (col.toLowerCase().includes('department') || col.toLowerCase() === 'dept') {
                          initData[col] = 'Computer Engineering';
                        } else if (col.toLowerCase().includes('status')) {
                          initData[col] = 'Complete';
                        } else {
                          initData[col] = '';
                        }
                      });
                      setNewEntryData(initData);
                      setShowAddEntryModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-zes-800 to-zes-700 hover:from-zes-900 text-white text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add First Record Manually</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        {selectedSubmission.columns.map((col) => (
                          <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-right w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSubmission.entries
                        .filter((entry) => {
                          if (!entrySearch.trim()) return true;
                          const q = entrySearch.toLowerCase();
                          return Object.values(entry.data || {}).some((v) => String(v).toLowerCase().includes(q));
                        })
                        .map((entry, idx) => (
                          <tr key={entry.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                              {entry.srNo || idx + 1}
                            </td>
                            {selectedSubmission.columns.map((col) => {
                              const val = entry.data[col] || '—';
                              const isComplete = val === 'Complete' || val === 'Yes' || val === 'RESOLVED';
                              const isWarning = val === 'Average' || val === 'Poor' || (col.includes('Attendance') && parseInt(val) < 75);

                              return (
                                <td key={col} className="py-2.5 px-3 text-slate-800 text-xs max-w-xs break-words">
                                  {isComplete ? (
                                    <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                      {val}
                                    </span>
                                  ) : isWarning ? (
                                    <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                      {val}
                                    </span>
                                  ) : (
                                    val
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Source: Ingested monthly compliance report for Zeal College of Engineering and Research, Induri.
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MANUAL DATA ENTRY FORM MODAL */}
      {showAddEntryModal && selectedSubmission && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-xs bg-zes-100 text-zes-800 px-2 py-0.5 rounded">
                  {selectedSubmission.reportNo}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add Record to Database</h3>
                  <p className="text-[11px] text-slate-500">{selectedSubmission.reportTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEntryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Form for Columns */}
            <form onSubmit={handleSaveManualEntry} className="flex-1 overflow-auto p-5 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSubmission.columns
                  .filter((col) => !col.toLowerCase().includes('sr. no') && !col.toLowerCase().includes('sr no'))
                  .map((col) => {
                    const isDeptCol = col.toLowerCase().includes('department') || col.toLowerCase() === 'dept';
                    const isStatusCol = col.toLowerCase().includes('status');
                    const isLongText = col.toLowerCase().includes('contents') || col.toLowerCase().includes('description') || col.toLowerCase().includes('remarks') || col.toLowerCase().includes('strengths') || col.toLowerCase().includes('issues');

                    return (
                      <div key={col} className={isLongText ? 'sm:col-span-2' : ''}>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                          {col} <span className="text-rose-500">*</span>
                        </label>

                        {isDeptCol ? (
                          <select
                            value={newEntryData[col] || OFFICIAL_DEPARTMENTS[0]}
                            onChange={(e) => setNewEntryData({ ...newEntryData, [col]: e.target.value })}
                            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                          >
                            {OFFICIAL_DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                        ) : isStatusCol ? (
                          <select
                            value={newEntryData[col] || 'Complete'}
                            onChange={(e) => setNewEntryData({ ...newEntryData, [col]: e.target.value })}
                            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                          >
                            <option value="Complete">Complete</option>
                            <option value="In Progress">In Progress</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="Verified">Verified</option>
                            <option value="Pending">Pending</option>
                            <option value="Average">Average</option>
                          </select>
                        ) : isLongText ? (
                          <textarea
                            rows={3}
                            value={newEntryData[col] || ''}
                            onChange={(e) => setNewEntryData({ ...newEntryData, [col]: e.target.value })}
                            placeholder={`Enter ${col.toLowerCase()} details...`}
                            className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                          />
                        ) : (
                          <input
                            type="text"
                            value={newEntryData[col] || ''}
                            onChange={(e) => setNewEntryData({ ...newEntryData, [col]: e.target.value })}
                            placeholder={`Enter ${col.toLowerCase()}...`}
                            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zes-600/20 focus:border-zes-600"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Form Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="px-5 py-2 bg-gradient-to-r from-zes-800 to-zes-700 hover:from-zes-900 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{savingEntry ? 'Saving to Database...' : 'Save Record to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

