import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  AlertCircle,
  Trash2,
  Pencil,
  X,
  CalendarDays,
  BookOpen,
  LayoutGrid,
  Columns,
  GraduationCap,
  Sparkles,
  Building2,
  Clock,
  Printer
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const YEAR_LABELS = ['FY', 'SY'];
const SLOT_TYPES = ['LECTURE', 'LAB', 'TUTORIAL'];

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

// Colour-code slot types like the ZCOER timetable PDFs
const slotColour = (type?: string) => {
  if (type === 'LAB') return 'bg-emerald-50 border-emerald-200 text-emerald-900';
  if (type === 'TUTORIAL') return 'bg-amber-50 border-amber-200 text-amber-900';
  return 'bg-blue-50 border-blue-200 text-blue-900';
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

  // View presentation mode: 'grid' (Matrix like official PDF) or 'cards' (Cards by Day)
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('ALL'); // 'ALL' | 'FY' | 'SY'
  const [filterDay, setFilterDay] = useState('ALL'); // 'ALL' | MONDAY...
  const [filterDivision, setFilterDivision] = useState('ALL'); // 'ALL' | 'Division A'...

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
    batchLabel: '',
  });

  const setField = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ----------------------------------------------------------------
  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterDept) params.departmentId = filterDept;
      if (filterYear !== 'ALL') params.yearLabel = filterYear;
      if (filterDay !== 'ALL') params.dayOfWeek = filterDay;

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
            b.sections?.forEach((s: any) => allSecs.push({ ...s, progName: p.name, deptCode: d.code }))
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
      batchLabel: slot.batchLabel ?? '',
    });
    setShowModal(true);
  };

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
        batchLabel: form.batchLabel || undefined,
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

  // Filtered slots according to division
  const filteredSlots = useMemo(() => {
    if (filterDivision === 'ALL') return slots;
    return slots.filter((s) => {
      const divName = s.section?.name || s.divisionLabel || '';
      return divName.toLowerCase().includes(filterDivision.toLowerCase());
    });
  }, [slots, filterDivision]);

  const displayedDays = filterDay !== 'ALL' ? [filterDay] : DAYS;

  // Counts for institutional KPI header
  const counts = useMemo(() => {
    const fy = slots.filter((s) => s.yearLabel === 'FY').length;
    const sy = slots.filter((s) => s.yearLabel === 'SY').length;
    const labs = slots.filter((s) => s.slotType === 'LAB').length;
    const lectures = slots.filter((s) => s.slotType === 'LECTURE').length;
    return { total: slots.length, fy, sy, labs, lectures };
  }, [slots]);

  return (
    <div className="space-y-6 pb-12">
      {/* Institutional Timetable Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
              ZEAL
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase font-mono">
                  Record No: ZCOER-ACAD/R/14A &bull; Rev: 00
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  WEF: 01/10/2026
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  AY 2026–2027
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-1">
                Zeal College of Engineering and Research — Academic Timetable
              </h1>
              <p className="text-xs text-slate-500">
                Official F.Y. (Sem I) &amp; S.Y. (Sem III) B.Tech schedules across all 4 departments with real faculty &amp; lab allocations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5" /> Official Grid
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Day Cards
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Slot
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Total Scheduled Slots</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">{counts.total}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium uppercase">FY B.Tech (Sem I)</span>
            <p className="text-base font-bold text-sky-600 mt-0.5">{counts.fy} slots</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium uppercase">SY B.Tech (Sem III)</span>
            <p className="text-base font-bold text-indigo-600 mt-0.5">{counts.sy} slots</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Practical Labs</span>
            <p className="text-base font-bold text-emerald-600 mt-0.5">{counts.labs} sessions</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Theory Lectures</span>
            <p className="text-base font-bold text-blue-600 mt-0.5">{counts.lectures} sessions</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Year selector pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setFilterYear('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterYear === 'ALL' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Years ({counts.total})
            </button>
            <button
              onClick={() => setFilterYear('FY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterYear === 'FY' ? 'bg-white font-bold text-sky-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FY B.Tech (Sem I) ({counts.fy})
            </button>
            <button
              onClick={() => setFilterYear('SY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterYear === 'SY' ? 'bg-white font-bold text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SY B.Tech (Sem III) ({counts.sy})
            </button>
          </div>

          {/* Division Selector pills */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-slate-400 font-medium mr-1 text-[11px]">Division:</span>
            {['ALL', 'Division A', 'Division B', 'Division C', 'Division D', 'Division E', 'Division F'].map((div) => (
              <button
                key={div}
                onClick={() => setFilterDivision(div)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  filterDivision === div
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {div === 'ALL' ? 'All Divisions' : div.replace('Division', 'Div')}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters (Day & Dept) */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Day:</span>
            <select
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
            >
              <option value="ALL">All Days (Monday – Saturday)</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Department:</span>
            <select
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="">All Departments (AIDS, CE, ECE, E&amp;TC)</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Lecture
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Practical Lab
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Tutorial / GFM
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading verified timetable schedules...</p>
        </div>
      ) : filteredSlots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <p className="text-sm font-bold text-slate-700">No timetable slots found matching filter criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Try switching years or resetting the division filter.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ========================================================================= */
        /* VIEW MODE 1: OFFICIAL GRID / MATRIX VIEW (LIKE ZCOER PDF)                */
        /* ========================================================================= */
        <div className="space-y-6">
          {displayedDays.map((day) => {
            const daySlots = filteredSlots.filter((s) => s.dayOfWeek === day);
            if (daySlots.length === 0) return null;

            // Group by division
            const divGroups: Record<string, any[]> = {};
            for (const slot of daySlots) {
              const divLabel = `${slot.yearLabel ?? ''} ${slot.section?.batch?.program?.department?.code ?? ''} ${slot.section?.name ?? ''}`.trim();
              if (!divGroups[divLabel]) divGroups[divLabel] = [];
              divGroups[divLabel].push(slot);
            }

            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                {/* Day Header */}
                <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">{day}</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">
                    {daySlots.length} Scheduled Slots Across {Object.keys(divGroups).length} Divisions
                  </span>
                </div>

                {/* Day Timetable Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                        <th className="py-2.5 px-4 w-44 border-r border-slate-200">Class / Division</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 text-center">09:15 – 10:15</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 text-center">10:15 – 11:15</th>
                        <th className="py-2.5 px-2 bg-slate-100/70 border-r border-slate-200 text-center text-[10px] text-slate-500 w-12">
                          RECESS
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-200 text-center">11:30 – 12:30</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 text-center">12:30 – 01:30</th>
                        <th className="py-2.5 px-2 bg-slate-100/70 border-r border-slate-200 text-center text-[10px] text-slate-500 w-12">
                          LUNCH
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-200 text-center">01:30/02:15 – 02:30/03:15</th>
                        <th className="py-2.5 px-3 text-center">02:30/03:15 – 03:30/04:15</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {Object.entries(divGroups).map(([division, divSlots]) => (
                        <tr key={division} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-200 bg-slate-50/30 text-xs">
                            {division}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {divSlots[0]?.yearLabel === 'FY' ? 'Semester I' : 'Semester III'}
                            </span>
                          </td>

                          {/* Dynamic slot renderer spanning slots */}
                          <td colSpan={8} className="p-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                              {divSlots
                                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                .map((slot) => (
                                  <div
                                    key={slot.id}
                                    className={`p-2 rounded-xl border text-xs flex flex-col justify-between ${slotColour(
                                      slot.slotType
                                    )} shadow-2xs hover:shadow-xs transition`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-[10px] font-mono font-bold opacity-75">
                                          {slot.startTime}–{slot.endTime}
                                        </span>
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/70">
                                          {slot.roomNumber}
                                        </span>
                                      </div>
                                      <p className="font-bold text-[11px] leading-tight">
                                        {slot.subject?.code}
                                        {slot.batchLabel && slot.batchLabel !== 'ALL' && (
                                          <span className="ml-1 text-[9px] bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-emerald-800">
                                            ({slot.batchLabel})
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-[10px] opacity-80 truncate mt-0.5">
                                        {slot.subject?.name}
                                      </p>
                                    </div>
                                    <div className="mt-2 pt-1.5 border-t border-black/5 flex items-center justify-between text-[10px]">
                                      <span className="font-medium opacity-90 truncate">
                                        Prof. {slot.faculty?.firstName} {slot.faculty?.lastName}
                                      </span>
                                      {isAdmin && (
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() => openEdit(slot)}
                                            className="p-0.5 hover:text-slate-900 transition"
                                            title="Edit"
                                          >
                                            <Pencil className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(slot.id)}
                                            className="p-0.5 hover:text-red-700 transition"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW MODE 2: CARD GRID BY DAY                                            */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedDays.map((day) => {
            const daySlots = filteredSlots.filter((s) => s.dayOfWeek === day);
            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800">{day}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No slots scheduled</p>
                ) : (
                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-xl border relative group ${slotColour(slot.slotType)} transition`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/70">
                                {slot.startTime}–{slot.endTime}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70">
                                {slot.roomNumber}
                              </span>
                              {slot.batchLabel && slot.batchLabel !== 'ALL' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/90 text-emerald-800 font-mono">
                                  Batch {slot.batchLabel}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-900 truncate">{slot.subject?.name}</p>
                            <p className="text-[10px] opacity-75 font-mono">{slot.subject?.code}</p>
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

                        <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[10px] opacity-85">
                          <span className="font-semibold">
                            Prof. {slot.faculty?.firstName} {slot.faculty?.lastName}
                          </span>
                          <span className="font-bold uppercase tracking-wider">{slot.slotType}</span>
                        </div>

                        <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
                          <BookOpen className="w-3 h-3" />
                          <span>
                            {slot.yearLabel} &bull; {slot.section?.name ?? 'Section'} ({slot.divisionLabel || 'Div'})
                          </span>
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
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

              {/* Row 5: Year + Division + Slot Type + Batch */}
              <div className="grid grid-cols-4 gap-2">
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Division</label>
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
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Batch</label>
                  <input
                    className={inputCls}
                    value={form.batchLabel}
                    onChange={(e) => setField('batchLabel', e.target.value)}
                    placeholder="A1 / B2 / ALL"
                  />
                </div>
              </div>

              {/* Row 6: Academic Session */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Academic Session</label>
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
