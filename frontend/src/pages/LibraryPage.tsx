import React, { useEffect, useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LibraryPage: React.FC = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'issues'>('catalog');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [borrowDays, setBorrowDays] = useState(14);

  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [totalCopies, setTotalCopies] = useState(5);
  const [shelfLocation, setShelfLocation] = useState('Rack CS-01');

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, issuesRes, studentsRes] = await Promise.all([
        apiClient.get('/library/books'), apiClient.get('/library/issues'), apiClient.get('/students'),
      ]);
      setBooks(booksRes.data.data); setIssues(issuesRes.data.data); setStudents(studentsRes.data.data);
      if (booksRes.data.data.length > 0) setSelectedBookId(booksRes.data.data[0].id);
      if (studentsRes.data.data.length > 0) setSelectedStudentId(studentsRes.data.data[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/library/issue', { bookId: selectedBookId, studentId: selectedStudentId, borrowDays: Number(borrowDays) });
      setShowIssueModal(false); fetchData(); alert('Book issued successfully.');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const handleReturnBook = async (issueRecordId: string) => {
    try {
      const res = await apiClient.post(`/library/return/${issueRecordId}`, { finePaid: true });
      alert(res.data.message || 'Book returned.'); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/library/books', { isbn, title, author, category, totalCopies: Number(totalCopies), shelfLocation });
      setShowAddModal(false); setIsbn(''); setTitle(''); setAuthor('');
      fetchData(); alert('Book cataloged.');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';
  const btnPrimary = 'px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition';
  const btnSecondary = 'px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition';

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">Book catalog, lending and overdue fines</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs font-medium">
            <button onClick={() => setActiveTab('catalog')} className={`px-3 py-1.5 transition ${activeTab === 'catalog' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Catalog</button>
            <button onClick={() => setActiveTab('issues')} className={`px-3 py-1.5 transition ${activeTab === 'issues' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Issues</button>
          </div>
          {isAdmin && (
            <>
              <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition">+ Add Book</button>
              <button onClick={() => setShowIssueModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"><Plus className="w-3.5 h-3.5" />Issue Book</button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading library...</div>
      ) : activeTab === 'catalog' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">ISBN: {b.isbn}</span>
                <span className="text-[10px] text-slate-500">{b.shelfLocation}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">by {b.author}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{b.category}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Available</span>
                <span className={`font-bold ${b.availableCopies > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {b.availableCopies} / {b.totalCopies}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Book</th><th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Issue Date</th><th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th><th className="py-3 px-4">Fine</th>
                  {isAdmin && <th className="py-3 px-4">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-slate-400">No circulation records.</td></tr>
                ) : issues.map((iss) => {
                  const isOverdue = iss.isOverdue || iss.status === 'OVERDUE';
                  const fine = iss.liveFineAmount ?? iss.fineAmount;
                  return (
                    <tr key={iss.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">{iss.book?.title}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{iss.student?.firstName} {iss.student?.lastName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{iss.student?.rollNumber}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{new Date(iss.issueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-slate-600">{new Date(iss.dueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${iss.status === 'RETURNED' ? 'bg-slate-100 text-slate-600' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isOverdue && iss.status !== 'RETURNED' ? 'OVERDUE' : iss.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{fine > 0 ? <span className="text-red-600 font-semibold">₹{fine}</span> : <span className="text-slate-400">₹0</span>}</td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          {iss.status !== 'RETURNED' && (
                            <button onClick={() => handleReturnBook(iss.id)} className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-700 text-white rounded text-[11px] font-medium transition">
                              <RotateCcw className="w-3 h-3" /> Return
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Issue Book to Student</h3>
            <form onSubmit={handleIssueBook} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Book</label>
                <select className={inputCls} value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)}>
                  {books.map((b) => <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>{b.title} ({b.availableCopies} available)</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Student</label>
                <select className={inputCls} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.rollNumber})</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Duration (days)</label>
                <input type="number" className={inputCls} min={1} max={60} value={borrowDays} onChange={(e) => setBorrowDays(Number(e.target.value))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowIssueModal(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" className={btnPrimary}>Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Add Book to Catalog</h3>
            <form onSubmit={handleAddBook} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">ISBN</label><input className={inputCls} required value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978-..." /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Title</label><input className={inputCls} required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Author</label><input className={inputCls} required value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Category</label><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Copies</label><input type="number" className={inputCls} min={1} value={totalCopies} onChange={(e) => setTotalCopies(Number(e.target.value))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Shelf Location</label><input className={inputCls} value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" className={btnPrimary}>Add Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
