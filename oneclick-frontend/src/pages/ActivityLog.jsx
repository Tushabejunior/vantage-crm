import { useEffect, useState } from 'react';
import { Phone, Mail, Users, MapPin, StickyNote, Plus } from 'lucide-react';
import { getActivities, createActivity, updateActivity, deleteActivity } from '../api/activities';
import { getClients } from '../api/clients';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const TYPES = ['Call', 'Email', 'Meeting', 'Visit', 'Note'];

const TYPE_META = {
  Call: { icon: Phone, color: '#6366F1' },
  Email: { icon: Mail, color: '#0EA5E9' },
  Meeting: { icon: Users, color: '#10B981' },
  Visit: { icon: MapPin, color: '#F59E0B' },
  Note: { icon: StickyNote, color: '#9CA3AF' },
};

const darkSelect = { colorScheme: 'dark' };
const inputCls = "bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

function pad(n) { return String(n).padStart(2, '0'); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyForm() {
  return { client_id: '', activity_type: 'Call', summary: '', details: '', activity_date: todayStr() };
}

export default function ActivityLog() {
  const { isAdmin } = useAuth();
  const [activities, setActivities] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [actRes, clientsRes] = await Promise.all([getActivities(), getClients()]);
      setActivities(actRes.data);
      setClients(clientsRes.data);
    } catch {
      setError('Failed to load the activity log');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(a) {
    setEditingId(a.id);
    setForm({
      client_id: a.client_id,
      activity_type: a.activity_type,
      summary: a.summary,
      details: a.details || '',
      activity_date: a.activity_date.slice(0, 10),
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, client_id: Number(form.client_id) };
    try {
      if (editingId) await updateActivity(editingId, payload);
      else await createActivity(payload);
      setShowForm(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save activity');
    }
  }

  async function handleDelete(id) {
    try {
      await deleteActivity(id);
      setConfirmDeleteId(null);
      loadAll();
    } catch {
      alert('Failed to delete activity');
    }
  }

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  const thisMonth = todayStr().slice(0, 7);
  const monthCount = activities.filter((a) => a.activity_date.slice(0, 7) === thisMonth).length;
  const clientsTouched = new Set(activities.map((a) => a.client_id)).size;

  const filtered = activities.filter((a) => {
    if (clientFilter !== 'all' && String(a.client_id) !== clientFilter) return false;
    if (typeFilter !== 'all' && a.activity_type !== typeFilter) return false;
    if (search && !`${a.summary} ${a.details} ${a.client_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">Total touchpoints</div>
          <div className="text-3xl font-bold text-[var(--text)] mt-1">{activities.length}</div>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">This month</div>
          <div className="text-3xl font-bold text-[var(--text)] mt-1">{monthCount}</div>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">Clients contacted</div>
          <div className="text-3xl font-bold text-[var(--text)] mt-1">{clientsTouched}</div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex flex-wrap gap-2 items-center mb-5">
          <input
            placeholder="Search the log…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} flex-1 min-w-[180px]`}
          />
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} style={darkSelect} className={inputCls}>
            <option value="all">All clients</option>
            {clients.map((c) => <option key={c.id} value={String(c.id)}>{c.display_name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={darkSelect} className={inputCls}>
            <option value="all">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-1.5 bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
              <Plus size={14} /> Log activity
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-sm text-[var(--text-muted)] py-8">
            {activities.length === 0 ? 'No activity logged yet.' : 'No activity matches these filters.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((a) => {
              const meta = TYPE_META[a.activity_type];
              const Icon = meta.icon;
              return (
                <div key={a.id} className="flex gap-3 items-start bg-[var(--bg)] rounded-xl p-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <span className="text-sm font-medium text-[var(--text)]">{a.summary}</span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">{a.activity_date.slice(0, 10)}</span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{a.client_name} · {a.activity_type}</div>
                    {a.details && <div className="text-xs text-[var(--text-muted)] mt-2 whitespace-pre-wrap">{a.details}</div>}
                  </div>
                  {isAdmin && (
                    <div className="whitespace-nowrap text-xs shrink-0">
                      <button onClick={() => openEdit(a)} className="text-[var(--text-muted)] hover:text-[var(--text)] mr-3 font-medium">Edit</button>
                      {confirmDeleteId === a.id ? (
                        <>
                          <button onClick={() => handleDelete(a.id)} className="text-[var(--danger)] font-semibold mr-2">Confirm</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-[var(--text-muted)]">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(a.id)} className="text-[var(--danger)] font-medium">Delete</button>
                      )}
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
            <h3 className="text-[var(--text)] font-semibold">{editingId ? 'Edit activity' : 'Log activity'}</h3>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)]">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} style={darkSelect} className={inputCls} required>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} style={darkSelect} className={inputCls}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} style={darkSelect} className={inputCls} required />
            </div>
            <input type="text" placeholder="What happened? (short summary)" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className={inputCls} required />
            <textarea rows={3} placeholder="Details (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className={inputCls} />
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="border border-[var(--border)] text-[var(--text)] text-sm rounded-lg px-4 py-2">Cancel</button>
              <button type="submit" className="bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
                {editingId ? 'Save changes' : 'Log activity'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}