import { useEffect, useState } from 'react';
import { getSales, createSale, updateSale, deleteSale } from '../api/sales';
import { getClients } from '../api/clients';
import { getServices } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const emptyForm = {
  client_id: '', service_id: '', amount_excl_vat: '', amount_incl_vat: '',
  commission_rate: 0.15, commission: '', date_paid: '', invoice_number: '',
  sale_month: '', notes: '',
};

const darkSelect = { colorScheme: 'dark' };
const inputCls = "bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

export default function Ledger() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [salesRes, clientsRes, servicesRes] = await Promise.all([getSales(), getClients(), getServices()]);
      setSales(salesRes.data);
      setClients(clientsRes.data);
      setServices(servicesRes.data);
    } catch {
      setError('Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const months = [...new Set(sales.map((s) => s.sale_month))].sort();

  const filtered = sales.filter((s) => {
    if (monthFilter !== 'all' && s.sale_month !== monthFilter) return false;
    if (statusFilter === 'paid' && !s.date_paid) return false;
    if (statusFilter === 'pending' && s.date_paid) return false;
    if (search && !`${s.client_name} ${s.service_name} ${s.invoice_number}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (b.date_paid || '9999').localeCompare(a.date_paid || '9999'));

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(sale) {
    setForm({
      client_id: sale.client_id, service_id: sale.service_id,
      amount_excl_vat: sale.amount_excl_vat, amount_incl_vat: sale.amount_incl_vat,
      commission_rate: sale.commission_rate, commission: sale.commission,
      date_paid: sale.date_paid ? sale.date_paid.slice(0, 10) : '',
      invoice_number: sale.invoice_number || '', sale_month: sale.sale_month, notes: sale.notes || '',
    });
    setEditingId(sale.id);
    setShowForm(true);
  }

  function handleExclChange(value) {
    const n = parseFloat(value) || 0;
    const rate = parseFloat(form.commission_rate) || 0;
    setForm((f) => ({
      ...f, amount_excl_vat: value,
      amount_incl_vat: Math.round(n * 1.18 * 100) / 100,
      commission: Math.round(n * rate * 100) / 100,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, client_id: Number(form.client_id), service_id: Number(form.service_id) };
    try {
      if (editingId) await updateSale(editingId, payload);
      else await createSale(payload);
      setShowForm(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save entry');
    }
  }

  async function handleDelete(id) {
    try {
      await deleteSale(id);
      setConfirmDeleteId(null);
      loadAll();
    } catch {
      alert('Failed to delete entry');
    }
  }

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex flex-wrap gap-2 items-center mb-5">
        <input
          placeholder="Search client, service, invoice…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} flex-1 min-w-[200px]`}
        />
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={darkSelect} className={inputCls}>
          <option value="all">All months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={darkSelect} className={inputCls}>
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
        <div className="flex-1" />
        {isAdmin && (
          <button onClick={openAddForm} className="bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
            + Add entry
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate" style={{ borderSpacing: '0 4px' }}>
          <thead>
            <tr className="text-left text-[var(--text-muted)] text-xs uppercase">
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Date paid</th>
              <th className="pb-2 pr-4 font-medium">Client</th>
              <th className="pb-2 pr-4 font-medium">Service</th>
              <th className="pb-2 pr-4 font-medium text-right">Excl. VAT</th>
              <th className="pb-2 pr-4 font-medium text-right">Commission</th>
              <th className="pb-2 pr-4 font-medium">Invoice #</th>
              {isAdmin && <th className="pb-2 pr-4"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="bg-[var(--bg)] hover:bg-[var(--surface-hover)] transition-colors">
                <td className="py-3 px-4 rounded-l-xl">
                  {s.date_paid
                    ? <span className="text-[var(--success)] bg-[var(--success-soft)] px-2.5 py-0.5 rounded-full text-xs font-medium">Paid</span>
                    : <span className="text-[var(--warning)] bg-[var(--warning-soft)] px-2.5 py-0.5 rounded-full text-xs font-medium">Pending</span>}
                </td>
                <td className="py-3 px-4 font-mono text-[var(--text-muted)]">{s.date_paid ? s.date_paid.slice(0, 10) : '—'}</td>
                <td className="py-3 px-4 text-[var(--text)] font-medium">{s.client_name}</td>
                <td className="py-3 px-4 text-[var(--text-muted)]">{s.service_name}</td>
                <td className="py-3 px-4 text-right font-mono text-[var(--text-muted)]">{Number(s.amount_excl_vat).toLocaleString()}</td>
                <td className="py-3 px-4 text-right font-mono text-[var(--text)]">{Number(s.commission).toLocaleString()}</td>
                <td className="py-3 px-4 font-mono text-[var(--text-muted)]">{s.invoice_number || '—'}</td>
                {isAdmin && (
                  <td className="py-3 px-4 rounded-r-xl whitespace-nowrap">
                    <button onClick={() => openEditForm(s)} className="text-[var(--text-muted)] hover:text-[var(--text)] mr-3 text-xs font-medium">Edit</button>
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

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-[var(--text)] font-semibold">{editingId ? 'Edit entry' : 'New sale entry'}</h3>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)]">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto grid grid-cols-2 gap-3">
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} style={darkSelect} className={`${inputCls} col-span-1`} required>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
            <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} style={darkSelect} className={`${inputCls} col-span-1`} required>
              <option value="">Select service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
            <input type="number" placeholder="Amount excl. VAT" value={form.amount_excl_vat} onChange={(e) => handleExclChange(e.target.value)} className={inputCls} required />
            <input type="number" placeholder="Amount incl. VAT" value={form.amount_incl_vat} onChange={(e) => setForm({ ...form, amount_incl_vat: e.target.value })} className={inputCls} />
            <input type="number" step="0.01" placeholder="Commission rate" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} className={inputCls} />
            <input type="number" placeholder="Commission" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} className={inputCls} />
            <input type="date" value={form.date_paid} onChange={(e) => setForm({ ...form, date_paid: e.target.value })} style={darkSelect} className={inputCls} />
            <input type="text" placeholder="Invoice #" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className={inputCls} />
            <input type="text" placeholder="Month (2026-07)" value={form.sale_month} onChange={(e) => setForm({ ...form, sale_month: e.target.value })} className={inputCls} required />
            <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} col-span-2`} />
            <div className="col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="border border-[var(--border)] text-[var(--text)] text-sm rounded-lg px-4 py-2">Cancel</button>
              <button type="submit" className="bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">{editingId ? 'Save changes' : 'Add entry'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}