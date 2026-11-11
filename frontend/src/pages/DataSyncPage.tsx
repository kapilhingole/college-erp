import React, { useState, useRef } from 'react';
import { FileUp, Download, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const DataSyncPage: React.FC = () => {
  const { user } = useAuth();
  const isAuthorized = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGEMENT' || user?.role === 'ADMIN';

  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState<'AUTO' | 'STUDENTS' | 'MARKS' | 'FEES'>('AUTO');
  const [mode, setMode] = useState<'UPSERT' | 'CREATE_ONLY' | 'UPDATE_ONLY'>('UPSERT');
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
      setFile(selected); setPreviewData(null); setPreviewError(null); setSyncResult(null); setSyncError(null);
      handleGeneratePreview(selected, entityType);
    }
  };

  const handleGeneratePreview = async (targetFile: File, targetEntity: 'AUTO' | 'STUDENTS' | 'MARKS' | 'FEES') => {
    setPreviewLoading(true); setPreviewError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await apiClient.post('/data-sync/preview', { fileBase64: base64Data, fileName: targetFile.name, entityType: targetEntity });
          setPreviewData(res.data.data);
        } catch (err: any) { setPreviewError(err.response?.data?.message || 'Failed to parse file.'); }
        finally { setPreviewLoading(false); }
      };
      reader.onerror = () => { setPreviewError('Failed to read file.'); setPreviewLoading(false); };
      reader.readAsDataURL(targetFile);
    } catch (err: any) { setPreviewError(err.message); setPreviewLoading(false); }
  };

  const handleProcessSync = async () => {
    if (!file) return;
    setProcessing(true); setSyncError(null); setSyncResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await apiClient.post('/data-sync/process', { fileBase64: base64Data, fileName: file.name, entityType, mode });
          setSyncResult(res.data.data);
        } catch (err: any) { setSyncError(err.response?.data?.message || 'Sync failed.'); }
        finally { setProcessing(false); }
      };
      reader.readAsDataURL(file);
    } catch (err: any) { setSyncError(err.message); setProcessing(false); }
  };

  const handleDownloadTemplate = async (templateEntity: string) => {
    try {
      const res = await apiClient.get(`/data-sync/template/${templateEntity}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.setAttribute('download', `${templateEntity}_sync_template.xlsx`);
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err: any) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

  if (!isAuthorized) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">Access Restricted</p>
        <p className="text-xs text-slate-400 mt-1">Only SuperAdmin and Management can access data sync.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Data Sync</h1>
          <p className="text-xs text-slate-500 mt-0.5">Upload PDF, Excel or CSV to sync portal data</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center">Templates:</span>
          {['students', 'marks', 'fees'].map((t) => (
            <button key={t} onClick={() => handleDownloadTemplate(t)} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition">
              <Download className="w-3.5 h-3.5" />{t}.xlsx
            </button>
          ))}
        </div>
      </div>

      {/* Upload config */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Data Category</label>
            <select className={inputCls} value={entityType} onChange={(e) => { const next = e.target.value as any; setEntityType(next); if (file) handleGeneratePreview(file, next); }}>
              <option value="AUTO">Auto-Detect</option>
              <option value="STUDENTS">Students</option>
              <option value="MARKS">Marks / Grades</option>
              <option value="FEES">Fee Payments</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Sync Mode</label>
            <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="UPSERT">Upsert (Update + Insert)</option>
              <option value="UPDATE_ONLY">Update Only</option>
              <option value="CREATE_ONLY">Create Only</option>
            </select>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Accepted Formats</p>
            <div className="flex gap-1.5 flex-wrap">
              {['PDF', 'XLSX', 'XLS', 'CSV'].map((f) => (
                <span key={f} className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">{f}</span>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">Max 15 MB</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-400'}`}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
          <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          {file ? (
            <div>
              <p className="text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-700">Click to browse or drag & drop</p>
              <p className="text-xs text-slate-400 mt-0.5">PDF gazettes, Excel rosters, CSV exports</p>
            </div>
          )}
        </div>

        {previewError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />{previewError}
          </div>
        )}
      </div>

      {/* Preview */}
      {previewLoading && (
        <div className="text-center py-8 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Parsing file structure...</p>
        </div>
      )}

      {previewData && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-800">Preview</span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{previewData.fileType}</span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{previewData.detectedEntity}</span>
              <span className="text-xs text-slate-500">{previewData.totalRows} records</span>
            </div>
            <button onClick={handleProcessSync} disabled={processing} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50">
              {processing ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Syncing...</> : <><Sparkles className="w-3.5 h-3.5" />Sync to Portal</>}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{previewData.columns?.slice(0, 8).map((col: string) => <th key={col} className="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase">{col}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.rows?.slice(0, 5).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {previewData.columns?.slice(0, 8).map((col: string) => <td key={col} className="py-2.5 px-4 text-slate-700 max-w-[150px] truncate">{row[col] ?? '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.totalRows > 5 && <p className="text-xs text-slate-400 text-center py-2">Showing 5 of {previewData.totalRows} rows</p>}
        </div>
      )}

      {/* Sync result */}
      {syncError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{syncError}
        </div>
      )}
      {syncResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-bold text-slate-900">Sync Complete</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: syncResult.totalProcessed },
              { label: 'Created', value: syncResult.created },
              { label: 'Updated', value: syncResult.updated },
              { label: 'Skipped', value: syncResult.skipped },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{s.value ?? 0}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {syncResult.errors?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-2">Errors ({syncResult.errors.length})</p>
              <ul className="space-y-1">
                {syncResult.errors.slice(0, 5).map((err: string, i: number) => <li key={i} className="text-xs text-red-600">{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
