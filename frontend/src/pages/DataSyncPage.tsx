import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const DataSyncPage: React.FC = () => {
  const { user } = useAuth();
  const isAuthorized =
    user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGEMENT' || user?.role === 'ADMIN';

  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState<'AUTO' | 'STUDENTS' | 'MARKS' | 'FEES'>('AUTO');
  const [mode, setMode] = useState<'UPSERT' | 'CREATE_ONLY' | 'UPDATE_ONLY'>('UPSERT');

  // Preview & Processing state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewData(null);
      setPreviewError(null);
      setSyncResult(null);
      setSyncError(null);
      handleGeneratePreview(selected, entityType);
    }
  };

  const handleGeneratePreview = async (
    targetFile: File,
    targetEntity: 'AUTO' | 'STUDENTS' | 'MARKS' | 'FEES'
  ) => {
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await apiClient.post('/data-sync/preview', {
            fileBase64: base64Data,
            fileName: targetFile.name,
            entityType: targetEntity,
          });
          setPreviewData(res.data.data);
        } catch (err: any) {
          setPreviewError(
            err.response?.data?.message || 'Failed to parse file. Ensure it is a valid PDF, Excel, or CSV.'
          );
        } finally {
          setPreviewLoading(false);
        }
      };
      reader.onerror = () => {
        setPreviewError('Failed to read file from disk.');
        setPreviewLoading(false);
      };
      reader.readAsDataURL(targetFile);
    } catch (err: any) {
      setPreviewError(err.message || 'File read error.');
      setPreviewLoading(false);
    }
  };

  const handleProcessSync = async () => {
    if (!file) return;

    setProcessing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await apiClient.post('/data-sync/process', {
            fileBase64: base64Data,
            fileName: file.name,
            entityType,
            mode,
          });
          setSyncResult(res.data.data);
        } catch (err: any) {
          setSyncError(
            err.response?.data?.message || 'Data synchronization failed. Please check file columns and content.'
          );
        } finally {
          setProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setSyncError(err.message || 'An error occurred during synchronization.');
      setProcessing(false);
    }
  };

  const handleDownloadTemplate = async (templateEntity: string) => {
    try {
      const res = await apiClient.get(`/data-sync/template/${templateEntity}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${templateEntity}_sync_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to download template: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          Universal Data Synchronization is restricted strictly to SuperAdmin and Management authorities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Institutional Authority Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Universal Data Ingestion &amp; Sync</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              SuperAdmin &amp; Management Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Feed PDF gazettes, Excel spreadsheets, or CSV files to automatically update and synchronize portal data
          </p>
        </div>

        {/* Template Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden lg:inline">
            Download Templates:
          </span>
          <button
            onClick={() => handleDownloadTemplate('students')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-zes-700" />
            <span>Students (.xlsx)</span>
          </button>
          <button
            onClick={() => handleDownloadTemplate('marks')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Marks (.xlsx)</span>
          </button>
          <button
            onClick={() => handleDownloadTemplate('fees')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>Fees (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Upload & Configuration Hub */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target Entity Option */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Data Category / Entity
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                const next = e.target.value as any;
                setEntityType(next);
                if (file) handleGeneratePreview(file, next);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="AUTO">✨ Auto-Detect (Smart Column Analysis)</option>
              <option value="STUDENTS">🎓 Students (Admissions, Semester, Branch, Contact)</option>
              <option value="MARKS">📊 Examination Marks &amp; Academic Grades</option>
              <option value="FEES">💰 Fee Payments &amp; Financial Ledger Clearances</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Auto-detect inspects headers inside your PDF/Excel sheet
            </span>
          </div>

          {/* Sync Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Synchronization Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="UPSERT">Upsert (Update Existing &amp; Insert New Records)</option>
              <option value="UPDATE_ONLY">Update Only (Strictly update existing matching PRN)</option>
              <option value="CREATE_ONLY">Create Only (Only add new records, skip duplicates)</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Matching relies on PRN (Enrollment Number), Roll Number, or Email
            </span>
          </div>

          {/* Supported Formats */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-600 block">Accepted File Formats</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                PDF (.pdf)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Excel (.xlsx, .xls)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                CSV (.csv)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              Max file size: 15 MB (Multi-page PDF gazettes supported)
            </span>
          </div>
        </div>

        {/* Dropzone Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
            file
              ? 'border-indigo-400 bg-indigo-50/30'
              : 'border-slate-300 hover:border-indigo-500 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf, .xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <FileUp className="w-7 h-7" />
            </div>

            {file ? (
              <div>
                <span className="text-sm font-bold text-indigo-900 block">{file.name}</span>
                <span className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB &bull; Click to choose a different file
                </span>
              </div>
            ) : (
              <div>
                <span className="text-sm font-bold text-slate-800 block">
                  Click to browse or drag &amp; drop PDF, Excel, or CSV here
                </span>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  SPPU result gazettes, admission roll-calls, fee receipts, or attendance rosters
                </span>
              </div>
            )}
          </div>
        </div>

        {previewError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{previewError}</span>
          </div>
        )}

        {/* 3. Live File Preview Table */}
        {previewLoading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-semibold">Parsing file structure and extracting columns...</span>
          </div>
        ) : previewData ? (
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Extracted Preview:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                  {previewData.fileType} Document
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  Target Entity: {previewData.detectedEntity}
                </span>
                <span className="text-xs text-slate-500">
                  ({previewData.totalRows} records found)
                </span>
              </div>

              <button
                onClick={handleProcessSync}
                disabled={processing}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synchronizing with Portal...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Process &amp; Update Portal</span>
                  </>
                )}
              </button>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    {previewData.columns.slice(0, 8).map((col: string) => (
                      <th key={col} className="py-2.5 px-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {previewData.sampleRows.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {previewData.columns.slice(0, 8).map((col: string) => (
                        <td key={col} className="py-2 px-3 text-slate-700">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Showing first {previewData.sampleRows.length} sample rows. Full dataset contains{' '}
              {previewData.totalRows} entries.
            </p>
          </div>
        ) : null}

        {syncError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {/* 4. Synchronization Results Summary */}
        {syncResult && (
          <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <h3 className="text-base font-bold text-emerald-950">
                  Synchronization Completed Successfully!
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-800">
                Entity: {syncResult.detectedEntity}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-xs">
                <span className="text-[11px] text-slate-400 block font-medium">Total Processed</span>
                <span className="text-xl font-black text-slate-800">{syncResult.totalRows}</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-xs">
                <span className="text-[11px] text-emerald-600 block font-medium">Newly Created</span>
                <span className="text-xl font-black text-emerald-700">{syncResult.createdCount}</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-xs">
                <span className="text-[11px] text-blue-600 block font-medium">Updated / Modified</span>
                <span className="text-xl font-black text-blue-700">{syncResult.updatedCount}</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-xs">
                <span className="text-[11px] text-slate-400 block font-medium">Skipped Rows</span>
                <span className="text-xl font-black text-slate-600">{syncResult.skippedCount}</span>
              </div>
            </div>

            {/* Skipped / Error Details */}
            {syncResult.errors && syncResult.errors.length > 0 && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-amber-900 block">
                  Skipped Row Warnings ({syncResult.errors.length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-amber-800 font-mono">
                  {syncResult.errors.map((e: any, idx: number) => (
                    <div key={idx}>
                      Row {e.row} {e.identifier ? `(${e.identifier})` : ''}: {e.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
