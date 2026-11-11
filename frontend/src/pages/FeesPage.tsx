import React, { useEffect, useState } from 'react';
import { Plus, Receipt, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const FeesPage: React.FC = () => {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledgers' | 'structures'>('ledgers');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showStructModal, setShowStructModal] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<any>(null);

  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'ONLINE' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('ONLINE');
  const [payNotes, setPayNotes] = useState('');

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
        apiClient.get('/fees/ledgers'), apiClient.get('/fees/structures'), apiClient.get('/departments'),
      ]);
      setLedgers(ledgersRes.data.data); setStructures(structRes.data.data); setDepartments(deptsRes.data.data);
      if (deptsRes.data.data.length > 0) {
        setStructDeptId(deptsRes.data.data[0].id);
        if (deptsRes.data.data[0].programs?.length > 0) setStructProgId(deptsRes.data.data[0].programs[0].id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openPayModal = (ledger: any) => { setSelectedLedger(ledger); setPayAmount(ledger.liveBalanceDue || ledger.balanceDue); setShowPayModal(true); };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedger) return;
    try {
      const res = await apiClient.post('/fees/pay', { ledgerId: selectedLedger.id, amount: Number(payAmount), paymentMethod: payMethod, notes: payNotes });
      alert(`Payment recorded! Receipt: ${res.data.data.payment.receiptNumber}`);
      setShowPayModal(false); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/fees/structures', { name: structName, departmentId: structDeptId, programId: structProgId, semester: Number(structSemester), academicYear: structYear, dueDate: new Date(structDueDate).toISOString(), lateFeePerDay: Number(structLateFee), components: [{ name: 'Tuition Fee', amount: Number(tuitionFee) }, { name: 'Development Fee', amount: Number(devFee) }, { name: 'Examination & University Fee', amount: Number(examFee) }] });
      setShowStructModal(false); setStructName(''); fetchData(); alert('Fee structure created!');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const handleGenerateInvoices = async (structureId: string, name: string) => {
    if (!confirm(`Generate invoices for "${name}"?`)) return;
    try { const res = await apiClient.post('/fees/generate-invoices', { feeStructureId: structureId }); alert(res.data.message || 'Invoices generated!'); fetchData(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const allPrograms = departments.flatMap((d) => (d.programs || []).map((p: any) => ({ ...p, deptCode: d.code })));
  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';
  const btnPrimary = 'px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition';
  const btnSecondary = 'px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition';

  const statusBadge: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700', OVERDUE: 'bg-red-100 text-red-700', PENDING: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Fees & Financial Ledgers</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fee structures, invoices, dues and payment receipts</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && activeTab === 'structures' && (
            <button onClick={() => setShowStructModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"><Plus className="w-3.5 h-3.5" />Add Structure</button>
          )}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs font-medium">
            <button onClick={() => setActiveTab('ledgers')} className={`px-3 py-1.5 transition ${activeTab === 'ledgers' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Ledgers</button>
            {isAdmin && <button onClick={() => setActiveTab('structures')} className={`px-3 py-1.5 transition ${activeTab === 'structures' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Fee Plans</button>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>
      ) : activeTab === 'ledgers' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Invoice #</th><th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Fee Plan</th><th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Paid</th><th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Status</th><th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgers.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-slate-400">No fee ledgers found.</td></tr>
                ) : ledgers.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{l.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{l.student?.firstName} {l.student?.lastName}</p>
                      <p className="text-[11px] font-mono text-slate-400">{l.student?.rollNumber}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-700">{l.feeStructure?.name}</p>
                      <p className="text-[11px] text-slate-400">Due: {new Date(l.dueDate).toLocaleDateString()}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">₹{l.totalDue?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-700 font-semibold">₹{l.amountPaid?.toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{(l.liveBalanceDue || l.balanceDue)?.toLocaleString()}
                      {l.accumulatedLateFee > 0 && <span className="block text-[10px] text-red-500 font-normal">+₹{l.accumulatedLateFee} fine</span>}
                    </td>
                    <td className="py-3 px-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[l.status] || 'bg-slate-100 text-slate-600'}`}>{l.status}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {l.status !== 'PAID' && isAdmin && <button onClick={() => openPayModal(l)} className="px-2.5 py-1 bg-slate-900 hover:bg-slate-700 text-white rounded text-[11px] font-medium transition">Record Pay</button>}
                        {l.payments?.length > 0 && <a href={`/api/v1/reports/receipt/${l.payments[0].id}/pdf`} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-slate-700" title="Download receipt"><Receipt className="w-3.5 h-3.5" /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {structures.map((st) => (
            <div key={st.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{st.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{st.department?.name} · Sem {st.semester} · {st.academicYear}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">₹{st.totalAmount?.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">Total term fee</p>
                </div>
              </div>
              <div className="space-y-1 py-3 border-y border-slate-100">
                {st.components?.map((c: any) => (
                  <div key={c.id} className="flex justify-between text-xs"><span className="text-slate-600">{c.name}</span><span className="font-semibold text-slate-800">₹{c.amount?.toLocaleString()}</span></div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">{st._count?.ledgers || 0} invoices generated</span>
                {isAdmin && (
                  <button onClick={() => handleGenerateInvoices(st.id, st.name)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"><Send className="w-3.5 h-3.5" />Generate Invoices</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && selectedLedger && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Record Payment</h3>
            <p className="text-xs text-slate-500 mb-4">Invoice: <span className="font-mono font-bold">{selectedLedger.invoiceNumber}</span></p>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Amount (₹)</label><input type="number" min={1} required className={inputCls} value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Method</label>
                <select className={inputCls} value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}>
                  <option value="ONLINE">Online / UPI</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque / DD</option><option value="BANK_TRANSFER">NEFT / RTGS</option>
                </select>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Notes</label><input className={inputCls} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Transaction ref..." /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowPayModal(false)} className={btnSecondary}>Cancel</button><button type="submit" className={btnPrimary}>Confirm & Receipt</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fee Structure Modal */}
      {showStructModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Add Fee Structure</h3>
            <form onSubmit={handleCreateStructure} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Plan Title</label><input className={inputCls} required value={structName} onChange={(e) => setStructName(e.target.value)} placeholder="B.E. COMP Sem 3 (2024-25)" /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Department</label><select className={inputCls} value={structDeptId} onChange={(e) => setStructDeptId(e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Program</label><select className={inputCls} value={structProgId} onChange={(e) => setStructProgId(e.target.value)}>{allPrograms.map((p) => <option key={p.id} value={p.id}>{p.deptCode} - {p.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Semester</label><input type="number" className={inputCls} min={1} max={8} value={structSemester} onChange={(e) => setStructSemester(Number(e.target.value))} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Academic Year</label><input className={inputCls} value={structYear} onChange={(e) => setStructYear(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label><input type="date" className={inputCls} value={structDueDate} onChange={(e) => setStructDueDate(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Late Fee/Day (₹)</label><input type="number" className={inputCls} value={structLateFee} onChange={(e) => setStructLateFee(Number(e.target.value))} /></div>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase pt-1">Fee Components</p>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Tuition (₹)</label><input type="number" className={inputCls} value={tuitionFee} onChange={(e) => setTuitionFee(Number(e.target.value))} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Development (₹)</label><input type="number" className={inputCls} value={devFee} onChange={(e) => setDevFee(Number(e.target.value))} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Exam (₹)</label><input type="number" className={inputCls} value={examFee} onChange={(e) => setExamFee(Number(e.target.value))} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowStructModal(false)} className={btnSecondary}>Cancel</button><button type="submit" className={btnPrimary}>Save Structure</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
