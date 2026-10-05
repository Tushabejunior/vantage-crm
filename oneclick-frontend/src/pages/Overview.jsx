import { useEffect, useState } from 'react';
import { getSales } from '../api/sales';
import { getMeetings } from '../api/meetings';
import { Wallet, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

function fmtRWF(n) {
  return 'RWF ' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatMonthLabel(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#EC4899', '#22C55E'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-[var(--text)] font-semibold mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {fmtRWF(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function Overview() {
  const [sales, setSales] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSales()
      .then((res) => setSales(res.data))
      .catch(() => setError('Failed to load sales data'))
      .finally(() => setLoading(false));
    getMeetings().then((res) => setMeetings(res.data)).catch(() => {});
  }, []);

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  const totalAll = sales.reduce((a, s) => a + Number(s.commission), 0);
  const totalPaid = sales.filter((s) => s.date_paid).reduce((a, s) => a + Number(s.commission), 0);
  const totalPending = totalAll - totalPaid;

  const monthMap = new Map();
  sales.forEach((s) => {
    if (!monthMap.has(s.sale_month)) monthMap.set(s.sale_month, { month: s.sale_month, paid: 0, pending: 0 });
    const m = monthMap.get(s.sale_month);
    if (s.date_paid) m.paid += Number(s.commission);
    else m.pending += Number(s.commission);
  });
  const monthlyData = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, label: formatMonthLabel(m.month) }));

  const clientMap = new Map();
  sales.forEach((s) => {
    if (!clientMap.has(s.client_name)) clientMap.set(s.client_name, 0);
    clientMap.set(s.client_name, clientMap.get(s.client_name) + Number(s.commission));
  });
  const topClients = Array.from(clientMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const serviceMap = new Map();
  sales.forEach((s) => {
    if (!serviceMap.has(s.service_name)) serviceMap.set(s.service_name, 0);
    serviceMap.set(s.service_name, serviceMap.get(s.service_name) + Number(s.commission));
  });
  const serviceData = Array.from(serviceMap.entries()).map(([name, value]) => ({ name, value }));

  const axisColor = 'var(--text-muted)';

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = meetings
    .filter((m) => m.status === 'Scheduled' && m.meeting_date.slice(0, 10) >= todayStr)
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center mb-3">
            <Wallet size={20} className="text-[var(--accent)]" />
          </div>
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">Total commission earned</div>
          <div className="text-3xl font-bold text-[var(--text)] mt-1">{fmtRWF(totalAll)}</div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--success-soft)] flex items-center justify-center mb-3">
            <Wallet size={20} className="text-[var(--success)]" />
          </div>
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">Confirmed paid</div>
          <div className="text-3xl font-bold text-[var(--text)] mt-1">{fmtRWF(totalPaid)}</div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--warning-soft)] flex items-center justify-center mb-3">
            <Clock size={20} className="text-[var(--warning)]" />
          </div>
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">Pending collection</div>
          <div className="text-3xl font-bold text-[var(--warning)] mt-1">{fmtRWF(totalPending)}</div>
        </div>
      </div>

      {upcomingMeetings.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h4 className="text-[var(--text)] font-semibold mb-4">Upcoming meetings</h4>
          <div className="flex flex-col gap-2">
            {upcomingMeetings.map((m) => (
              <div key={m.id} className="flex justify-between items-center bg-[var(--bg)] rounded-lg px-3 py-2">
                <div>
                  <div className="text-sm text-[var(--text)] font-medium">{m.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{m.client_name} · {m.meeting_type}</div>
                </div>
                <div className="text-xs font-mono text-[var(--text-muted)]">{m.meeting_date.slice(0, 10)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h4 className="text-[var(--text)] font-semibold mb-4">Revenue by month</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke={axisColor} tick={{ fontSize: 11, fill: axisColor }} />
              <YAxis stroke={axisColor} tick={{ fontSize: 11, fill: axisColor }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="paid" stackId="a" fill="#10B981" name="Paid" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="Pending" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h4 className="text-[var(--text)] font-semibold mb-4">Top clients</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topClients} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke={axisColor} tick={{ fontSize: 11, fill: axisColor }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" stroke={axisColor} tick={{ fontSize: 11, fill: axisColor }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#6366F1" name="Commission" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h4 className="text-[var(--text)] font-semibold mb-4">Service mix</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {serviceData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {serviceData.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <h4 className="text-[var(--text)] font-semibold mb-4">Recent entries</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate" style={{ borderSpacing: '0 4px' }}>
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase">
                <th className="pb-2 pr-4 font-medium">Client</th>
                <th className="pb-2 pr-4 font-medium">Service</th>
                <th className="pb-2 pr-4 font-medium text-right">Commission</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 8).map((s) => (
                <tr key={s.id} className="bg-[var(--bg)] hover:bg-[var(--surface-hover)] transition-colors">
                  <td className="py-3 px-4 rounded-l-xl text-[var(--text)] font-medium">{s.client_name}</td>
                  <td className="py-3 px-4 text-[var(--text-muted)]">{s.service_name}</td>
                  <td className="py-3 px-4 text-right font-mono text-[var(--text)]">{fmtRWF(s.commission)}</td>
                  <td className="py-3 px-4 rounded-r-xl">
                    {s.date_paid ? (
                      <span className="text-[var(--success)] bg-[var(--success-soft)] px-2.5 py-0.5 rounded-full text-xs font-medium">Paid</span>
                    ) : (
                      <span className="text-[var(--warning)] bg-[var(--warning-soft)] px-2.5 py-0.5 rounded-full text-xs font-medium">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}