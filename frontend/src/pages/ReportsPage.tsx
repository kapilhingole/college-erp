import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(3);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const isAdminOrFaculty = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'FACULTY';

  useEffect(() => {
    apiClient.get('/students')
      .then((res) => {
        setStudents(res.data.data);
        if (res.data.data.length > 0) setSelectedStudentId(res.data.data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const downloadFile = (url: string, filename: string) => {
    const token = localStorage.getItem('college_erp_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!res.ok) throw new Error('Download failed'); return res.blob(); })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob); a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
      })
      .catch((err) => alert('Failed: ' + err.message));
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-xs text-slate-500 mt-0.5">Export Excel spreadsheets and certified PDF transcripts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Excel Exports */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Excel Exports (.xlsx)</h3>
              <p className="text-xs text-slate-500">Structured data for institutional review</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Attendance Defaulters (<75%)', desc: 'All students below 75% threshold', url: '/api/v1/reports/attendance-defaulters/excel', file: 'attendance_defaulters.xlsx' },
              { label: 'Fee Defaulters & Dues', desc: 'Outstanding balances and late fees', url: '/api/v1/reports/fee-defaulters/excel', file: 'fee_defaulters.xlsx' },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{r.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                </div>
                <button onClick={() => downloadFile(r.url, r.file)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition shrink-0">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Transcripts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">PDF Transcripts</h3>
              <p className="text-xs text-slate-500">Official semester grade report cards</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Student</label>
              {loading ? (
                <div className="text-xs text-slate-400">Loading...</div>
              ) : (
                <select className={inputCls} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.rollNumber}) — {s.department?.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Semester</label>
              <select className={inputCls} value={selectedSemester} onChange={(e) => setSelectedSemester(Number(e.target.value))}>
                {[1,2,3,4].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <button
              onClick={() => { if (!selectedStudentId) return; downloadFile(`/api/v1/reports/report-card/${selectedStudentId}/${selectedSemester}/pdf`, `report_card_sem${selectedSemester}.pdf`); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" /> Generate Report Card PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
