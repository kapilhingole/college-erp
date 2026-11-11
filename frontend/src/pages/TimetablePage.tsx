import React, { useEffect, useState } from 'react';
import { Plus, AlertCircle, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const TimetablePage: React.FC = () => {
  const [slots, setSlots] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState('MONDAY');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [subjectId, setSubjectId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [roomNumber, setRoomNumber] = useState('Room-301');

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const [slotsRes, subsRes, facRes, deptsRes] = await Promise.all([
        apiClient.get('/timetable'), apiClient.get('/academics/subjects'),
        apiClient.get('/faculty'), apiClient.get('/departments'),
      ]);
      setSlots(slotsRes.data.data); setSubjects(subsRes.data.data); setFaculty(facRes.data.data);
      const allSecs: any[] = [];
      deptsRes.data.data.forEach((d: any) => d.programs?.forEach((p: any) => p.batches?.forEach((b: any) => b.sections?.forEach((s: any) => allSecs.push({ ...s, progName: p.name })))));
      setSections(allSecs);
      if (subsRes.data.data.length > 0) setSubjectId(subsRes.data.data[0].id);
      if (facRes.data.data.length > 0) setFacultyId(facRes.data.data[0].id);
      if (allSecs.length > 0) setSectionId(allSecs[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTimetable(); }, []);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault(); setConflictError(null);
    try {
      await apiClient.post('/timetable', { dayOfWeek, startTime, endTime, subjectId, facultyId, sectionId, roomNumber, semester: 3, academicSession: '2024-25' });
      setShowModal(false); fetchTimetable(); alert('Slot added successfully.');
    } catch (err: any) {
      if (err.response?.status === 409) setConflictError(err.response.data.message || 'Collision detected.');
      else alert(err.response?.data?.message || 'Failed to add slot.');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Remove this slot?')) return;
    try { await apiClient.delete(`/timetable/${id}`); fetchTimetable(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed.'); }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Timetable</h1>
          <p className="text-xs text-slate-500 mt-0.5">Weekly schedule with collision detection</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setConflictError(null); setShowModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">
            <Plus className="w-3.5 h-3.5" /> Add Slot
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading timetable...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((day) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === day);
            return (
              <div key={day} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">{day}</span>
                  <span className="text-[10px] text-slate-400">{daySlots.length} class{daySlots.length !== 1 ? 'es' : ''}</span>
                </div>
                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No classes</p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((slot) => (
                      <div key={slot.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800 truncate pr-4">{slot.subject.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">{slot.startTime}-{slot.endTime}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                          <span>Prof. {slot.faculty.firstName} {slot.faculty.lastName}</span>
                          <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">{slot.roomNumber}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{slot.section?.name || 'Section A'}</p>
                        {isAdmin && (
                          <button onClick={() => handleDeleteSlot(slot.id)} className="absolute top-1.5 right-1.5 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Schedule New Slot</h3>
            {conflictError && (
              <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><strong>Collision:</strong> {conflictError}</span>
              </div>
            )}
            <form onSubmit={handleCreateSlot} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Day</label>
                  <select className={inputCls} value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                    {days.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Start</label><input className={inputCls} required value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="09:00" /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">End</label><input className={inputCls} required value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="10:00" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
                <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Faculty</label>
                  <select className={inputCls} value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
                    {faculty.map((f) => <option key={f.id} value={f.id}>Prof. {f.firstName} {f.lastName}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Room</label><input className={inputCls} required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Section</label>
                <select className={inputCls} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.progName})</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">Add Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
