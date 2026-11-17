import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getSales } from '../api/sales';
import { getServices, createService, updateService, deleteService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

function fmtRWF(n) {
  return 'RWF ' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

const inputCls = "bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

export default function Services() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [salesRes, servicesRes] = await Promise.all([getSales(), getServices()]);
      setSales(salesRes.data);
      setServices(servicesRes.data);
    } catch {
      setError('Failed to load service data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function openAdd() {
    setEditingId(null);
    setName('');
    setShowForm(true);
  }

  function openEdit(service) {
    setEditingId(service.id);
    setName(service.name);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editingId) await updateService(editingId, { display_name: name.trim() });
      else await createService({ display_name: name.trim() });
      setShowForm(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save service');
    }
  }

  async function handleDelete(id) {
    try {
      await deleteService(id);
      setConfirmDeleteId(null);
      loadAll();
    } catch (err) {
      setConfirmDeleteId(null);
      alert(err.response?.data?.error || 'Failed to delete service');
    }
  }

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  const stats = services
    .map((sv) => {
      const rows = sales.filter((s) => s.service_id === sv.id);
      const total = rows.reduce((a, s) => a + Number(s.commission), 0);
      return {
        id: sv.id,
        name: sv.display_name,
        total,
        deals: rows.length,
        avg: rows.length ? total / rows.length : 0,
        clients: [...new Set(rows.map((s) => s.client_name))],
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
        <h4 className="text-[var(--text)] font-semibold">Services, ranked by total commission</h4>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
            <Plus size={14} /> Add service
          </button>
        )}
      </div>

      {stats.length === 0 ? (
        <div className="text-center text-sm text-[var(--text-muted)] py-8">No services yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate" style={{ borderSpacing: '0 4px' }}>
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase">
                <th className="pb-2 pr-4 font-medium">Service</th>
                <th className="pb-2 pr-4 font-medium text-right">Total commission</th>
                <th className="pb-2 pr-4 font-medium text-right">Deals</th>
                <th className="pb-2 pr-4 font-medium text-right">Avg deal size</th>
                <th className="pb-2 pr-4 font-medium">Clients</th>
                {isAdmin && <th className="pb-2 pr-4"></th>}
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} className="bg-[var(--bg)] hover:bg-[var(--surface-hover)] transition-colors">
                  <td className="py-3 px-4 rounded-l-xl text-[var(--text)] font-medium">{s.name}</td>
                  <td className="py-3 px-4 text-right font-mono text-[var(--text)]">{fmtRWF(s.total)}</td>
                  <td className="py-3 px-4 text-right font-mono text-[var(--text-muted)]">{s.deals}</td>
                  <td className="py-3 px-4 text-right font-mono text-[var(--text-muted)]">{fmtRWF(s.avg)}</td>
                  <td className="py-3 px-4 max-w-xs truncate text-[var(--text-muted)]" title={s.clients.join(', ')}>
                    {s.clients.length ? s.clients.join(', ') : '—'}
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 rounded-r-xl whitespace-nowrap">
                      <button onClick={() => openEdit(s)} className="text-[var(--text-muted)] hover:text-[var(--text)] mr-3 text-xs font-medium">Edit</button>
                      {confirmDeleteId === s.id ? (
                        <>
                          <button onClick={() => handleDelete(s.id)} className="text-[var(--danger)] font-semibold mr-2 text-xs">Confirm</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-[var(--text-muted)] text-xs">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(s.id)} className="text-[var(--danger)] text-xs font-medium">Delete</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-[var(--text)] font-semibold">{editingId ? 'Rename service' : 'New service'}</h3>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)]">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Service name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              autoFocus
              required
            />
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="border border-[var(--border)] text-[var(--text)] text-sm rounded-lg px-4 py-2">Cancel</button>
              <button type="submit" className="bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
                {editingId ? 'Save changes' : 'Add service'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}