import { Fragment, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getSales } from '../api/sales';
import { getClients, createClient, updateClient, deleteClient, updateClientSector } from '../api/clients';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const SECTORS = [
  'NGO / Nonprofit', 'Government', 'Finance & Banking', 'Healthcare',
  'Education', 'Retail & Commerce', 'Manufacturing', 'Technology',
  'Agriculture', 'Hospitality & Tourism', 'Real Estate', 'Other',
];

const SECTOR_COLORS = {
  'NGO / Nonprofit': '#8B5CF6',
  'Government': '#64748B',
  'Finance & Banking': '#0EA5E9',
  'Healthcare': '#F43F5E',
  'Education': '#F59E0B',
  'Retail & Commerce': '#EC4899',
  'Manufacturing': '#78716C',
  'Technology': '#6366F1',
  'Agriculture': '#22C55E',
  'Hospitality & Tourism': '#14B8A6',
  'Real Estate': '#A855F7',
  'Other': '#9CA3AF',
};

function fmtRWF(n) {
  return 'RWF ' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

function daysSince(isoDate) {
  if (!isoDate) return null;
  return Math.round((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

const darkSelect = { colorScheme: 'dark' };
const inputCls = "bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

function SectorPill({ sector, isAdmin, onChange }) {
  const [editing, setEditing] = useState(false);

  if (editing && isAdmin) {
    return (
      <select
        value={sector}
        onChange={(e) => { onChange(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        style={darkSelect}
        autoFocus
        className="bg-[var(--bg)] border border-[var(--border)] rounded-full px-2 py-1 text-xs text-[var(--text)] outline-none"
      >
        <option value="">— None —</option>
        {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }

  if (!sector) {
    return isAdmin ? (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-full px-2.5 py-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
      >
        + Add sector
      </button>
    ) : <span className="text-xs text-[var(--text-muted)]">—</span>;
  }

  const color = SECTOR_COLORS[sector] || '#9CA3AF';
  return (
    <button
      onClick={() => isAdmin && setEditing(true)}
      disabled={!isAdmin}
      className="text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: `${color}22` }}
    >
      {sector}
    </button>
  );
}

export default function Clients() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [sectorFilter, setSectorFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ display_name: '', sector: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [salesRes, clientsRes] = await Promise.all([getSales(), getClients()]);
      setSales(salesRes.data);
      setClients(clientsRes.data);
    } catch {
      setError('Failed to load client data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSectorChange(clientId, sector) {
    try {
      await updateClientSector(clientId, sector);
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, sector } : c)));
    } catch {
      alert('Failed to update sector');
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm({ display_name: '', sector: '' });
    setShowForm(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setForm({ display_name: c.name, sector: c.sector || '' });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.display_name.trim()) return;
    try {
      if (editingId) await updateClient(editingId, form);
      else await createClient(form);
      setShowForm(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save client');
    }
  }

  async function handleDelete(id) {
    try {
      await deleteClient(id);
      setConfirmDeleteId(null);
      loadAll();
    } catch (err) {
      setConfirmDeleteId(null);
      alert(err.response?.data?.error || 'Failed to delete client');
    }
  }

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  const salesByClient = new Map();
  sales.forEach((s) => {
    if (!salesByClient.has(s.client_id)) salesByClient.set(s.client_id, []);
    salesByClient.get(s.client_id).push(s);
  });

  let clientStats = clients
    .map((c) => {
      const rows = salesByClient.get(c.id) || [];
      const total = rows.reduce((a, s) => a + Number(s.commission), 0);
      const paidDates = rows.filter((s) => s.date_paid).map((s) => s.date_paid.slice(0, 10)).sort();
      const pending = rows.filter((s) => !s.date_paid);
      return {
        id: c.id,
        name: c.display_name,
        sector: c.sector || '',
        totalCommission: total,
        dealCount: rows.length,
        avgDeal: rows.length ? total / rows.length : 0,
        services: [...new Set(rows.map((s) => s.service_name))],
        lastDate: paidDates.length ? paidDates[paidDates.length - 1] : null,
        pendingCount: pending.length,
        pendingAmount: pending.reduce((a, s) => a + Number(s.commission), 0),
      };
    })
    .sort((a, b) => b.totalCommission - a.totalCommission);

  if (sectorFilter !== 'all') {
    clientStats = clientStats.filter((c) => c.sector === sectorFilter);
  }

  const usedSectors = [...new Set(clients.map((c) => c.sector).filter(Boolean))];
  const colCount = isAdmin ? 7 : 6;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
        <h4 className="text-[var(--text)] font-semibold">Clients, ranked by total commission</h4>
        <div className="flex gap-2 items-center">
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            style={darkSelect}
            className={inputCls}
          >
            <option value="all">All sectors</option>
            {usedSectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-1.5 bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
              <Plus size={14} /> Add client
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate" style={{ borderSpacing: '0 4px' }}>
          <thead>
            <tr className="text-left text-[var(--text-muted)] text-xs uppercase">
              <th className="pb-2 pr-4 font-medium">Client</th>
              <th className="pb-2 pr-4 font-medium">Sector</th>
              <th className="pb-2 pr-4 font-medium text-right">Total commission</th>
              <th className="pb-2 pr-4 font-medium text-right">Deals</th>
              <th className="pb-2 pr-4 font-medium">Services</th>
              <th className="pb-2 pr-4 font-medium">Last paid</th>
              {isAdmin && <th className="pb-2 pr-4"></th>}
            </tr>
          </thead>
          <tbody>
            {clientStats.map((c) => {
              const dormant = c.lastDate && daysSince(c.lastDate) > 60;
              const isOpen = expandedId === c.id;
              return (
                <Fragment key={c.id}>
                  <tr className="bg-[var(--bg)] hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-3 px-4 rounded-l-xl cursor-pointer" onClick={() => setExpandedId(isOpen ? null : c.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text)] font-medium">{c.name}</span>
                        {dormant && (
                          <span className="text-[var(--warning)] bg-[var(--warning-soft)] px-2 py-0.5 rounded-full text-xs font-semibold">Dormant</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <SectorPill sector={c.sector} isAdmin={isAdmin} onChange={(val) => handleSectorChange(c.id, val)} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--text)]">{fmtRWF(c.totalCommission)}</td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--text-muted)]">{c.dealCount}</td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{c.services.length}</td>
                    <td className={`py-3 px-4 font-mono text-[var(--text-muted)] ${isAdmin ? '' : 'rounded-r-xl'}`}>{c.lastDate || '—'}</td>
                    {isAdmin && (
                      <td className="py-3 px-4 rounded-r-xl whitespace-nowrap">
                        <button onClick={() => openEdit(c)} className="text-[var(--text-muted)] hover:text-[var(--text)] mr-3 text-xs font-medium">Edit</button>
                        {confirmDeleteId === c.id ? (
                          <>
                            <button onClick={() => handleDelete(c.id)} className="text-[var(--danger)] font-semibold mr-2 text-xs">Confirm</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-[var(--text-muted)] text-xs">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(c.id)} className="text-[var(--danger)] text-xs font-medium">Delete</button>
                        )}
                      </td>
                    )}
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={colCount} className="px-4 pb-2">
                        <div className="bg-[var(--surface-hover)] rounded-xl p-4 flex flex-wrap gap-6 text-sm text-[var(--text)]">
                          <div>
                            <div className="text-xs text-[var(--text-muted)] uppercase">Average deal size</div>
                            <div className="font-mono">{fmtRWF(c.avgDeal)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-[var(--text-muted)] uppercase">Services purchased</div>
                            <div>{c.services.length ? c.services.join(', ') : '—'}</div>
                          </div>
                          {c.pendingCount > 0 && (
                            <div>
                              <div className="text-xs text-[var(--text-muted)] uppercase">Pending</div>
                              <div className="font-mono text-[var(--warning)]">{c.pendingCount} invoice(s), {fmtRWF(c.pendingAmount)}</div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-[var(--text)] font-semibold">{editingId ? 'Edit client' : 'New client'}</h3>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)]">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Client name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className={inputCls}
              autoFocus
              required
            />
            <select
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              style={darkSelect}
              className={inputCls}
            >
              <option value="">No sector yet</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="border border-[var(--border)] text-[var(--text)] text-sm rounded-lg px-4 py-2">Cancel</button>
              <button type="submit" className="bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
                {editingId ? 'Save changes' : 'Add client'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}