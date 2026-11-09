import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Download, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(3);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const isAdminOrFaculty =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'FACULTY';

  useEffect(() => {
    apiClient
      .get('/students')
      .then((res) => {
        setStudents(res.data.data);
        if (res.data.data.length > 0) setSelectedStudentId(res.data.data[0].id);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const downloadFile = (url: string, filename: string) => {
    const token = localStorage.getItem('college_erp_token');
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Failed to download report: ' + err.message));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Institutional Reports &amp; Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Export standardized Excel (.xlsx) spreadsheets and certified PDF transcripts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Excel Spreadsheet Exports */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Excel Data Exports (.xlsx)</h3>
              <p className="text-xs text-slate-500">Structured spreadsheets for institutional review</p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            {/* Attendance Defaulters Excel */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Attendance Defaulters Roster (&lt; 75%)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Complete list of all students currently below the 75% attendance threshold
                </p>
              </div>
              <button
                onClick={() =>
                  downloadFile(
                    '/api/v1/reports/attendance-defaulters/excel',
                    'attendance_defaulters.xlsx'
                  )
                }
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center shrink-0"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Excel
              </button>
            </div>

            {/* Fee Defaulters Excel */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Fee Defaulters &amp; Dues Register</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Outstanding ledger balances, overdue days, and late fee penalties
                </p>
              </div>
              <button
                onClick={() =>
                  downloadFile('/api/v1/reports/fee-defaulters/excel', 'fee_defaulters.xlsx')
                }
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center shrink-0"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Certified PDF Report Card Transcripts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Certified PDF Transcripts</h3>
              <p className="text-xs text-slate-500">Official digital semester grade report cards</p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Enrolled Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.rollNumber}) - {s.department?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
                <option value={3}>Semester 3</option>
                <option value={4}>Semester 4</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (!selectedStudentId) return;
                downloadFile(
                  `/api/v1/reports/report-card/${selectedStudentId}/${selectedSemester}/pdf`,
                  `report_card_sem${selectedSemester}.pdf`
                );
              }}
              className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate Official Report Card PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

