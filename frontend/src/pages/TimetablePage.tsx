import React, { useEffect, useState } from 'react';
import { Plus, AlertCircle, Trash2, Pencil, X, CalendarDays, BookOpen } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const YEAR_LABELS = ['FY', 'SY'];
const SLOT_TYPES = ['LECTURE', 'LAB', 'TUTORIAL'];

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

// Colour-code slot types like the ZCOER timetable PDFs
const slotColour = (type?: string) => {
  if (type === 'LAB') return 'bg-green-50 border-green-200 text-green-800';
  if (type === 'TUTORIAL') return 'bg-amber-50 border-amber-200 text-amber-800';
  return 'bg-blue-50 border-blue-200 text-blue-800';
};

export const TimetablePage: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGEMENT';

  const [slots, setSlots] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterDay, setFilterDay] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    dayOfWeek: 'MONDAY',
    startTime: '09:15',
    endTime: '10:15',
    subjectId: '',
    facultyId: '',
    sectionId: '',
    roomNumber: 'A1-02',
    semester: 3,
    academicSession: '2026-27',
    divisionLabel: '',
    yearLabel: 'SY',
    slotType: 'LECTURE',
  });

  const setField = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ----------------------------------------------------------------
  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterDept) params.departmentId = filterDept;
      if (filterYear) params.yearLabel = filterYear;
      if (filterDay) params.dayOfWeek = filterDay;

      const [slotsRes, subsRes, facRes, deptRes] = await Promise.all([
        apiClient.get('/timetable', { params }),
        apiClient.get('/academics/subjects'),
        apiClient.get('/faculty'),
        apiClient.get('/departments'),
      ]);

      setSlots(slotsRes.data.data ?? []);
      setSubjects(subsRes.data.data ?? []);
      setFacultyList(facRes.data.data ?? []);
      setDepartments(deptRes.data.data ?? []);

      const allSecs: any[] = [];
      (deptRes.data.data ?? []).forEach((d: any) =>
        d.programs?.forEach((p: any) =>
          p.batches?.forEach((b: any) =>
            b.sections?.forEach((s: any) => allSecs.push({ ...s, progName: p.name }))
          )
        )
      );
      setSections(allSecs);

      // Pre-populate form defaults
      if (subsRes.data.data?.length) setField('subjectId', subsRes.data.data[0].id);
      if (facRes.data.data?.length) setField('facultyId', facRes.data.data[0].id);
      if (allSecs.length) setField('sectionId', allSecs[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [filterDept, filterYear, filterDay]);

  // ----------------------------------------------------------------
  const openCreate = () => {
    setEditingSlot(null);
    setConflictError(null);
    setShowModal(true);
  };

  const openEdit = (slot: any) => {
    setEditingSlot(slot);
    setConflictError(null);
    setForm({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: slot.subjectId,
      facultyId: slot.facultyId,
      sectionId: slot.sectionId,
      roomNumber: slot.roomNumber,
      semester: slot.semester,
      academicSession: slot.academicSession,
      divisionLabel: slot.divisionLabel ?? '',
      yearLabel: slot.yearLabel ?? 'SY',
      slotType: slot.slotType ?? 'LECTURE',
    });
    setShowModal(true);
  };

  // ----------------------------------------------------------------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        semester: Number(form.semester),
        divisionLabel: form.divisionLabel || undefined,
        yearLabel: form.yearLabel || undefined,
      };

      if (editingSlot) {
        await apiClient.patch(`/timetable/${editingSlot.id}`, payload);
      } else {
        await apiClient.post('/timetable', payload);
      }
      setShowModal(false);
      fetchTimetable();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictError(err.response.data.message || 'Scheduling collision detected.');
      } else {
        alert(err.response?.data?.message || 'Failed to save slot.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this timetable slot?')) return;
    try {
      await apiClient.delete(`/timetable/${id}`);
      fetchTimetable();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete slot.');
    }
  };

  // ----------------------------------------------------------------
  const displayedDays = filterDay ? [filterDay] : DAYS;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Timetable</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Department-wise weekly schedule — FY &amp; SY with collision detection
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Slot
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>

        <select
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="">All Years</option>
          {YEAR_LABELS.map((y) => (
            <option key={y} value={y}>
              {y === 'FY' ? 'First Year (FY)' : 'Second Year (SY)'}
            </option>
          ))}
        </select>

        <select
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
        >
          <option value="">All Days</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-200 inline-block" /> Lecture
          <span className="w-2.5 h-2.5 rounded-sm bg-green-200 inline-block ml-2" /> Lab
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-200 inline-block ml-2" /> Tutorial
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading timetable...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedDays.map((day) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === day);
            return (
              <div key={day} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-800">{day}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No slots scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-2.5 rounded-lg border relative group ${slotColour(slot.slotType)}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{slot.subject?.name}</p>
                            <p className="text-[10px] opacity-70 font-mono">
                              {slot.startTime}–{slot.endTime}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => openEdit(slot)}
                                  className="p-1 hover:text-slate-900 transition"
                                  title="Edit slot"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(slot.id)}
                                  className="p-1 hover:text-red-600 transition"
                                  title="Delete slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] opacity-80">
                          <span>
                            Prof.{' '}
                            {slot.faculty?.firstName} {slot.faculty?.lastName}
                          </span>
                          <span className="bg-white/60 px-1.5 py-0.5 rounded font-mono">
                            {slot.roomNumber}
                          </span>
                          {slot.yearLabel && (
                            <span className="bg-white/60 px-1.5 py-0.5 rounded font-bold">
                              {slot.yearLabel}
                            </span>
                          )}
                          {slot.divisionLabel && (
                            <span className="opacity-70">{slot.divisionLabel}</span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-1 text-[10px] opacity-60">
                          <BookOpen className="w-3 h-3" />
                          <span>{slot.section?.name ?? 'Section'}</span>
                          <span className="ml-auto font-bold uppercase">{slot.slotType}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSlot ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {conflictError && (
              <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Collision detected:</strong> {conflictError}
                </span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              {/* Row 1: Day + Times */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Day</label>
                  <select
                    className={inputCls}
                    value={form.dayOfWeek}
                    onChange={(e) => setField('dayOfWeek', e.target.value)}
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start</label>
                  <input
                    className={inputCls}
                    required
                    value={form.startTime}
                    onChange={(e) => setField('startTime', e.target.value)}
                    placeholder="09:15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End</label>
                  <input
                    className={inputCls}
                    required
                    value={form.endTime}
                    onChange={(e) => setField('endTime', e.target.value)}
                    placeholder="10:15"
                  />
                </div>
              </div>

              {/* Row 2: Subject */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
                <select
                  className={inputCls}
                  value={form.subjectId}
                  onChange={(e) => setField('subjectId', e.target.value)}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Faculty + Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Faculty</label>
                  <select
                    className={inputCls}
                    value={form.facultyId}
                    onChange={(e) => setField('facultyId', e.target.value)}
                  >
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        Prof. {f.firstName} {f.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Room No.</label>
                  <input
                    className={inputCls}
                    required
                    value={form.roomNumber}
                    onChange={(e) => setField('roomNumber', e.target.value)}
                    placeholder="A1-02"
                  />
                </div>
              </div>

              {/* Row 4: Section + Semester */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Section</label>
                  <select
                    className={inputCls}
                    value={form.sectionId}
                    onChange={(e) => setField('sectionId', e.target.value)}
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.progName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    className={inputCls}
                    min={1}
                    max={12}
                    value={form.semester}
                    onChange={(e) => setField('semester', e.target.value)}
                  />
                </div>
              </div>

              {/* Row 5: Year + Division + Slot Type */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
                  <select
                    className={inputCls}
                    value={form.yearLabel}
                    onChange={(e) => setField('yearLabel', e.target.value)}
                  >
                    {YEAR_LABELS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Division
                  </label>
                  <input
                    className={inputCls}
                    value={form.divisionLabel}
                    onChange={(e) => setField('divisionLabel', e.target.value)}
                    placeholder="Div A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select
                    className={inputCls}
                    value={form.slotType}
                    onChange={(e) => setField('slotType', e.target.value)}
                  >
                    {SLOT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 6: Academic Session */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Academic Session
                </label>
                <input
                  className={inputCls}
                  value={form.academicSession}
                  onChange={(e) => setField('academicSession', e.target.value)}
                  placeholder="2026-27"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingSlot ? 'Save Changes' : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
