import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, AlertCircle, Clock, Trash2, ShieldCheck } from 'lucide-react';
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

  // Slot Form
  const [dayOfWeek, setDayOfWeek] = useState('MONDAY');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [subjectId, setSubjectId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [roomNumber, setRoomNumber] = useState('Room-301');

  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const [slotsRes, subsRes, facRes, deptsRes] = await Promise.all([
        apiClient.get('/timetable'),
        apiClient.get('/academics/subjects'),
        apiClient.get('/faculty'),
        apiClient.get('/departments'),
      ]);
      setSlots(slotsRes.data.data);
      setSubjects(subsRes.data.data);
      setFaculty(facRes.data.data);

      const allSecs: any[] = [];
      deptsRes.data.data.forEach((d: any) => {
        d.programs?.forEach((p: any) => {
          p.batches?.forEach((b: any) => {
            b.sections?.forEach((s: any) => {
              allSecs.push({ ...s, progName: p.name });
            });
          });
        });
      });
      setSections(allSecs);

      if (subsRes.data.data.length > 0) setSubjectId(subsRes.data.data[0].id);
      if (facRes.data.data.length > 0) setFacultyId(facRes.data.data[0].id);
      if (allSecs.length > 0) setSectionId(allSecs[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    try {
      await apiClient.post('/timetable', {
        dayOfWeek,
        startTime,
        endTime,
        subjectId,
        facultyId,
        sectionId,
        roomNumber,
        semester: 3,
        academicSession: '2024-25',
      });

      setShowModal(false);
      fetchTimetable();
      alert('Timetable slot allocated successfully with zero conflicts.');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictError(err.response.data.message || 'Collision detected in timetable.');
      } else {
        alert(err.response?.data?.message || 'Failed to add timetable slot.');
      }
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to remove this timetable slot?')) return;
    try {
      await apiClient.delete(`/timetable/${id}`);
      fetchTimetable();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete slot.');
    }
  };

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timetable &amp; Schedule Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Weekly course timetables with automated faculty, classroom, and section collision detection
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setConflictError(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Schedule Class Slot
          </button>
        )}
      </div>

      {/* Timetable Grid by Day */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading timetable schedules...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {days.map((day) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === day);

            return (
              <div
                key={day}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-slate-800 text-sm">{day}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {daySlots.length} classes
                  </span>
                </div>

                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No classes scheduled</p>
                ) : (
                  <div className="space-y-2.5">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs relative group"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>{slot.subject.name}</span>
                          <span className="font-mono text-indigo-600">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>
                            Prof. {slot.faculty.firstName} {slot.faculty.lastName}
                          </span>
                          <span className="font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {slot.roomNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-indigo-600 mt-1">
                          {slot.section?.name || 'Section A'}
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Schedule Slot Modal with Real-time Collision Feedback */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Schedule New Lecture Slot</h3>
            <p className="text-xs text-slate-500 mb-4">
              Protected by ACID timetable collision engine
            </p>

            {conflictError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <span className="font-bold">COLLISION DETECTED:</span>
                  <div className="mt-0.5">{conflictError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateSlot} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Day</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start (HH:MM)
                  </label>
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="09:00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End (HH:MM)
                  </label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="10:00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Faculty Instructor
                  </label>
                  <select
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        Prof. {f.firstName} {f.lastName} ({f.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Room-301"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Class / Section
                </label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.progName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Validate &amp; Schedule Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
