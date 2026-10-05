import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Check, Ban } from 'lucide-react';
import { getMeetings, createMeeting, updateMeetingStatus, deleteMeeting } from '../api/meetings';
import { getClients } from '../api/clients';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const MEETING_TYPES = ['Discovery Call', 'Follow-up', 'Contract Signing', 'Check-in', 'Other'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_STYLES = {
  Scheduled: { color: 'var(--accent)', bg: 'var(--accent-soft)' },
  Completed: { color: 'var(--success)', bg: 'var(--success-soft)' },
  Cancelled: { color: 'var(--danger)', bg: 'var(--danger-soft)' },
};

const darkSelect = { colorScheme: 'dark' };
const inputCls = "bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const emptyForm = { client_id: '', title: '', meeting_type: 'Follow-up', meeting_date: '', meeting_time: '', notes: '' };

export default function CalendarPage({ prefill, clearPrefill }) {
  const { isAdmin } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(dateKey(today.getFullYear(), today.getMonth(), today.getDate()));

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadAll() {
    setLoading(true);
    try {
      const [meetingsRes, clientsRes] = await Promise.all([getMeetings(), getClients()]);
      setMeetings(meetingsRes.data);
      setClients(clientsRes.data);
    } catch {
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (prefill) {
      setForm({ ...emptyForm, ...prefill, meeting_date: selectedDate });
      setShowForm(true);
      clearPrefill();
    }
  }, [prefill]);

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  const meetingsByDate = new Map();
  meetings.forEach((m) => {
    const key = m.meeting_date.slice(0, 10);
    if (!meetingsByDate.has(key)) meetingsByDate.set(key, []);
    meetingsByDate.get(key).push(m);
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function changeMonth(delta) {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function openAddForm() {
    setForm({ ...emptyForm, meeting_date: selectedDate });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createMeeting({ ...form, client_id: Number(form.client_id) });
      setShowForm(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create meeting');
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await updateMeetingStatus(id, status);
      loadAll();
    } catch {
      alert('Failed to update status');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this meeting?')) return;
    try {
      await deleteMeeting(id);
      loadAll();
    } catch {
      alert('Failed to delete meeting');
    }
  }

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedMeetings = (meetingsByDate.get(selectedDate) || []).sort((a, b) =>
    (a.meeting_time || '').localeCompare(b.meeting_time || '')
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-[var(--text)] font-semibold">{MONTH_NAMES[viewMonth]} {viewYear}</h4>
          <div className="flex gap-1">
            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-xs font-semibold text-[var(--text-muted)] py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const key = dateKey(viewYear, viewMonth, d);
            const dayMeetings = meetingsByDate.get(key) || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(key)}
                className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start gap-0.5 text-sm transition-colors
                  ${isSelected ? 'bg-[var(--accent)] text-white' : isToday ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text)] hover:bg-[var(--surface-hover)]'}`}
              >
                <span className="font-medium">{d}</span>
                {dayMeetings.length > 0 && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[var(--accent)]'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-[var(--text)] font-semibold text-sm">{selectedDate}</h4>
          {isAdmin && (
            <button onClick={openAddForm} className="p-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80">
              <Plus size={16} />
            </button>
          )}
        </div>

        {selectedMeetings.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)] flex-1 flex items-center justify-center text-center">
            No meetings scheduled for this day.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedMeetings.map((m) => {
              const style = STATUS_STYLES[m.status];
              return (
                <div key={m.id} className="border border-[var(--border)] rounded-xl p-3">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{m.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">{m.client_name} · {m.meeting_type}</div>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: style.color, backgroundColor: style.bg }}>
                      {m.status}
                    </span>
                  </div>
                  {m.meeting_time && <div className="text-xs text-[var(--text-muted)] font-mono mb-1">{m.meeting_time.slice(0, 5)}</div>}
                  {m.notes && <div className="text-xs text-[var(--text-muted)] mb-2">{m.notes}</div>}
                  {isAdmin && m.status === 'Scheduled' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleStatusChange(m.id, 'Completed')} className="flex items-center gap-1 text-xs text-[var(--success)] font-medium">
                        <Check size={12} /> Complete
                      </button>
                      <button onClick={() => handleStatusChange(m.id, 'Cancelled')} className="flex items-center gap-1 text-xs text-[var(--danger)] font-medium">
                        <Ban size={12} /> Cancel
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="text-xs text-[var(--text-muted)] ml-auto">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-[var(--text)] font-semibold">New meeting</h3>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)]"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} style={darkSelect} className={inputCls} required>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
            <input type="text" placeholder="Meeting title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required />
            <select value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })} style={darkSelect} className={inputCls}>
              {MEETING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} style={darkSelect} className={inputCls} required />
              <input type="time" value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} style={darkSelect} className={inputCls} />
            </div>
            <textarea rows={3} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="border border-[var(--border)] text-[var(--text)] text-sm rounded-lg px-4 py-2">Cancel</button>
              <button type="submit" className="bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">Add meeting</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}