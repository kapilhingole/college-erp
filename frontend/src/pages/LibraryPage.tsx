import React, { useEffect, useState } from 'react';
import { Library, Plus, BookOpen, Clock, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
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

  // Issue modal state
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [borrowDays, setBorrowDays] = useState(14);

  // Add Book state
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [totalCopies, setTotalCopies] = useState(5);
  const [shelfLocation, setShelfLocation] = useState('Rack CS-01');

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, issuesRes, studentsRes] = await Promise.all([
        apiClient.get('/library/books'),
        apiClient.get('/library/issues'),
        apiClient.get('/students'),
      ]);
      setBooks(booksRes.data.data);
      setIssues(issuesRes.data.data);
      setStudents(studentsRes.data.data);

      if (booksRes.data.data.length > 0) setSelectedBookId(booksRes.data.data[0].id);
      if (studentsRes.data.data.length > 0) setSelectedStudentId(studentsRes.data.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/library/issue', {
        bookId: selectedBookId,
        studentId: selectedStudentId,
        borrowDays: Number(borrowDays),
      });

      setShowIssueModal(false);
      fetchData();
      alert('Book issued to student successfully! Available copies updated.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to issue book.');
    }
  };

  const handleReturnBook = async (issueRecordId: string) => {
    try {
      const res = await apiClient.post(`/library/return/${issueRecordId}`, { finePaid: true });
      alert(res.data.message || 'Book returned.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to return book.');
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/library/books', {
        isbn,
        title,
        author,
        category,
        totalCopies: Number(totalCopies),
        shelfLocation,
      });

      setShowAddModal(false);
      setIsbn('');
      setTitle('');
      setAuthor('');
      fetchData();
      alert('Book cataloged successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to catalog book.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Library &amp; Learning Resources</h1>
          <p className="text-xs text-slate-500 mt-1">
            Book cataloging, student lending lifecycle, and automated overdue fine calculations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Tab Switcher */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'catalog' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Book Catalog
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'issues' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Lending Circulation
            </button>
          </div>

          {isAdmin && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                + Add Title
              </button>
              <button
                onClick={() => setShowIssueModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Issue Book
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading library resources...</div>
      ) : activeTab === 'catalog' ? (
        /* Catalog Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    ISBN: {b.isbn}
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {b.shelfLocation || 'Main Stack'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">{b.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">Author(s): {b.author}</p>
                <p className="text-[11px] text-slate-400 mt-1">Category: {b.category}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Inventory Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full ${
                      b.availableCopies > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {b.availableCopies} available of {b.totalCopies}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Issues & Lending Table */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Book Title</th>
                  <th className="py-2.5 px-3">Student Borrower</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Fine Rate</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No book circulation records currently active.
                    </td>
                  </tr>
                ) : (
                  issues.map((iss: any) => {
                    const isOverdue = iss.isOverdue || iss.status === 'OVERDUE';
                    const fine = iss.liveFineAmount ?? iss.fineAmount;

                    return (
                      <tr key={iss.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {iss.book?.title}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">
                            {iss.student?.firstName} {iss.student?.lastName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {iss.student?.rollNumber}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(iss.issueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {new Date(iss.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              iss.status === 'RETURNED'
                                ? 'bg-slate-100 text-slate-700'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOverdue && iss.status !== 'RETURNED' ? 'OVERDUE' : iss.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {fine > 0 ? (
                            <span className="font-bold text-rose-600">
                              ₹{fine} ({iss.liveOverdueDays || iss.overdueDays} days late)
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {iss.status !== 'RETURNED' && isAdmin && (
                            <button
                              onClick={() => handleReturnBook(iss.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-semibold flex items-center"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Return Book
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Issue Book to Student</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enforces 4-book limit and atomic copy inventory decrement
            </p>

            <form onSubmit={handleIssueBook} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Book from Catalog
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>
                      {b.title} ({b.availableCopies} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enrolled Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Borrowing Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={borrowDays}
                  onChange={(e) => setBorrowDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Add Book to Catalog</h3>
            <form onSubmit={handleAddBook} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ISBN</label>
                <input
                  type="text"
                  required
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="978-0132350884"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Author</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Copies</label>
                  <input
                    type="number"
                    min={1}
                    value={totalCopies}
                    onChange={(e) => setTotalCopies(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={shelfLocation}
                    onChange={(e) => setShelfLocation(e.target.value)}
                    placeholder="Rack A-1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Catalog Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

