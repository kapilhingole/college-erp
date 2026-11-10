import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Plus,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  Send,
  Building2,
  CreditCard,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const FeesPage: React.FC = () => {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledgers' | 'structures'>('ledgers');

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [showStructModal, setShowStructModal] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<any>(null);

  // Payment form state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'ONLINE' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('ONLINE');
  const [payNotes, setPayNotes] = useState('');

  // Fee Structure form state
  const [structName, setStructName] = useState('');
  const [structDeptId, setStructDeptId] = useState('');
  const [structProgId, setStructProgId] = useState('');
  const [structSemester, setStructSemester] = useState(3);
  const [structYear, setStructYear] = useState('2024-25');
  const [structDueDate, setStructDueDate] = useState('2024-11-30');
  const [structLateFee, setStructLateFee] = useState(50);
  const [tuitionFee, setTuitionFee] = useState(45000);
  const [devFee, setDevFee] = useState(7000);
  const [examFee, setExamFee] = useState(3000);

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ledgersRes, structRes, deptsRes] = await Promise.all([
        apiClient.get('/fees/ledgers'),
        apiClient.get('/fees/structures'),
        apiClient.get('/departments'),
      ]);
      setLedgers(ledgersRes.data.data);
      setStructures(structRes.data.data);
      setDepartments(deptsRes.data.data);

      if (deptsRes.data.data.length > 0) {
        setStructDeptId(deptsRes.data.data[0].id);
        if (deptsRes.data.data[0].programs?.length > 0) {
          setStructProgId(deptsRes.data.data[0].programs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPayModal = (ledger: any) => {
    setSelectedLedger(ledger);
    setPayAmount(ledger.liveBalanceDue || ledger.balanceDue);
    setShowPayModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedger) return;

    try {
      const res = await apiClient.post('/fees/pay', {
        ledgerId: selectedLedger.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        notes: payNotes,
      });

      alert(`Payment recorded successfully! Receipt Number: ${res.data.data.payment.receiptNumber}`);
      setShowPayModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment recording failed.');
    }
  };

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/fees/structures', {
        name: structName,
        departmentId: structDeptId,
        programId: structProgId,
        semester: Number(structSemester),
        academicYear: structYear,
        dueDate: new Date(structDueDate).toISOString(),
        lateFeePerDay: Number(structLateFee),
        components: [
          { name: 'Tuition Fee', amount: Number(tuitionFee) },
          { name: 'Development Fee', amount: Number(devFee) },
          { name: 'Examination & University Fee', amount: Number(examFee) },
        ],
      });

      setShowStructModal(false);
      setStructName('');
      fetchData();
      alert('Fee structure created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create fee structure.');
    }
  };

  const handleGenerateInvoices = async (structureId: string, name: string) => {
    if (!confirm(`Generate official student invoices for fee plan "${name}"?`)) return;

    try {
      const res = await apiClient.post('/fees/generate-invoices', {
        feeStructureId: structureId,
      });
      alert(res.data.message || 'Invoices generated successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate invoices.');
    }
  };

  const allPrograms = departments.flatMap((d) =>
    (d.programs || []).map((p: any) => ({ ...p, deptCode: d.code, deptName: d.name }))
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fees &amp; Financial Ledgers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Fee structure configuration, invoice generation, dues tracking, and payment receipts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && activeTab === 'structures' && (
            <button
              onClick={() => setShowStructModal(true)}
              className="px-3.5 py-1.5 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Fee Structure</span>
            </button>
          )}

          {/* Tab switch */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ledgers')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'ledgers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Student Ledgers &amp; Dues
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('structures')}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  activeTab === 'structures' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Fee Plans &amp; Structures
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading fee records...</div>
      ) : activeTab === 'ledgers' ? (
        /* Ledgers Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Term &amp; Plan</th>
                  <th className="py-3 px-4">Total Due</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No student fee ledgers recorded yet.
                    </td>
                  </tr>
                ) : (
                  ledgers.map((l) => {
                    const isPaid = l.status === 'PAID';
                    const isOverdue = l.status === 'OVERDUE';

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {l.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {l.student?.firstName} {l.student?.lastName}
                          </div>
                          <div className="text-[11px] font-mono text-indigo-600">
                            {l.student?.rollNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{l.feeStructure?.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Due: {new Date(l.dueDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          ₹{l.totalDue?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                          ₹{l.amountPaid?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{(l.liveBalanceDue || l.balanceDue)?.toLocaleString()}
                          {l.accumulatedLateFee > 0 && (
                            <span className="block text-[10px] text-rose-500 font-normal">
                              +₹{l.accumulatedLateFee} fine
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            {!isPaid && isAdmin && (
                              <button
                                onClick={() => openPayModal(l)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold"
                              >
                                Record Pay
                              </button>
                            )}
                            {l.payments?.length > 0 && (
                              <a
                                href={`/api/v1/reports/receipt/${l.payments[0].id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-500 hover:text-indigo-600"
                                title="Download PDF Receipt"
                              >
                                <Receipt className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Fee Structures */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {structures.map((st) => (
            <div
              key={st.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{st.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {st.department?.name} • Semester {st.semester} • {st.academicYear}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-slate-900">
                    ₹{st.totalAmount?.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400">Total Term Fee</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold uppercase text-slate-400">
                  Fee Components
                </span>
                {st.components?.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex justify-between text-xs py-1 px-2 rounded bg-slate-50"
                  >
                    <span className="text-slate-700">{c.name}</span>
                    <span className="font-semibold text-slate-900">₹{c.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {st._count?.ledgers || 0} student invoices generated
                </span>
                {isAdmin && (
                  <button
                    onClick={() => handleGenerateInvoices(st.id, st.name)}
                    className="px-3 py-1.5 bg-zes-800 hover:bg-zes-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate Invoices</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && selectedLedger && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Record Fee Payment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Invoice: <span className="font-mono font-bold">{selectedLedger.invoiceNumber}</span>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ONLINE">Online NetBanking / UPI</option>
                  <option value="CASH">Cash at Finance Counter</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="BANK_TRANSFER">Direct NEFT/RTGS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Transaction Remarks
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Counter Receipt No. or Bank Ref"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Confirm &amp; Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Fee Structure */}
      {showStructModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Academic Fee Structure</h3>
            <p className="text-xs text-slate-500 mb-4">Define semester fee components and due dates</p>

            <form onSubmit={handleCreateStructure} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Title</label>
                <input
                  type="text"
                  required
                  value={structName}
                  onChange={(e) => setStructName(e.target.value)}
                  placeholder="B.E. Computer Engineering - Sem 3 (2024-25)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={structDeptId}
                  onChange={(e) => {
                    setStructDeptId(e.target.value);
                    const matched = departments.find((d) => d.id === e.target.value);
                    if (matched?.programs?.length > 0) {
                      setStructProgId(matched.programs[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Program</label>
                <select
                  value={structProgId}
                  onChange={(e) => setStructProgId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {allPrograms
                    .filter((p) => p.departmentId === structDeptId || !structDeptId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={structSemester}
                    onChange={(e) => setStructSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={structYear}
                    onChange={(e) => setStructYear(e.target.value)}
                    placeholder="2024-25"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={structDueDate}
                    onChange={(e) => setStructDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Late Fine / Day (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={structLateFee}
                    onChange={(e) => setStructLateFee(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-700 block">
                  Fee Breakdown (₹)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Tuition</label>
                    <input
                      type="number"
                      value={tuitionFee}
                      onChange={(e) => setTuitionFee(Number(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Development</label>
                    <input
                      type="number"
                      value={devFee}
                      onChange={(e) => setDevFee(Number(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Exam &amp; Misc</label>
                    <input
                      type="number"
                      value={examFee}
                      onChange={(e) => setExamFee(Number(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-xs"
                    />
                  </div>
                </div>
                <div className="pt-1 text-right text-xs font-bold text-slate-900">
                  Total: ₹{(Number(tuitionFee) + Number(devFee) + Number(examFee)).toLocaleString()}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStructModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded-xl text-xs font-bold"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
