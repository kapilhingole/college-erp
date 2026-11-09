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
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const FeesPage: React.FC = () => {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledgers' | 'structures'>('ledgers');
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<any>(null);

  // Payment form state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'ONLINE' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>(
    'ONLINE'
  );
  const [payNotes, setPayNotes] = useState('');

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ledgersRes, structRes] = await Promise.all([
        apiClient.get('/fees/ledgers'),
        apiClient.get('/fees/structures'),
      ]);
      setLedgers(ledgersRes.data.data);
      setStructures(structRes.data.data);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fees &amp; Financial Ledgers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Fee structure configuration, invoice generation, dues tracking, and payment receipts
          </p>
        </div>

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

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading financial ledgers...</div>
      ) : activeTab === 'ledgers' ? (
        /* Ledgers Table */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Fee Plan</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Total Billed</th>
                  <th className="py-2.5 px-3">Paid</th>
                  <th className="py-2.5 px-3">Live Balance Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No fee records found.
                    </td>
                  </tr>
                ) : (
                  ledgers.map((l: any) => {
                    const balance = l.liveBalanceDue ?? l.balanceDue;
                    const isOverdue = l.evaluatedStatus === 'OVERDUE' || l.paymentStatus === 'OVERDUE';
                    const isPaid = balance <= 0;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {l.invoiceNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">
                            {l.student?.firstName} {l.student?.lastName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {l.student?.rollNumber}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">{l.feeStructure?.name}</td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {new Date(l.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          ₹{l.totalDue?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">
                          ₹{l.amountPaid?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <div
                            className={`font-black ${
                              isPaid
                                ? 'text-slate-400'
                                : isOverdue
                                ? 'text-rose-600'
                                : 'text-slate-800'
                            }`}
                          >
                            ₹{balance?.toLocaleString()}
                          </div>
                          {l.livePenalty > 0 && (
                            <div className="text-[10px] text-rose-500 font-semibold">
                              +₹{l.livePenalty} late penalty
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {l.evaluatedStatus || l.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3">
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
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
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

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Post Payment (ACID Transaction)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

