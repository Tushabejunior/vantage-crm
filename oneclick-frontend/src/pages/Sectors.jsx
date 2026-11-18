import { useEffect, useState } from 'react';
import { Users, Layers, AlertCircle, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getClients } from '../api/clients';
import { getSales } from '../api/sales';
import { getActivities } from '../api/activities';
import { getMeetings } from '../api/meetings';
import { SECTOR_COLORS, NO_SECTOR_COLOR } from '../constants/sectors';

const NO_SECTOR = 'No sector';

function fmtRWF(n) {
  return 'RWF ' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

function daysSince(isoDate) {
  if (!isoDate) return null;
  return Math.round((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

const colorFor = (name) => SECTOR_COLORS[name] || NO_SECTOR_COLOR;

export default function Sectors() {
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [activities, setActivities] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([getClients(), getSales(), getActivities(), getMeetings()])
      .then(([c, s, a, m]) => {
        setClients(c.data);
        setSales(s.data);
        setActivities(a.data);
        setMeetings(m.data);
      })
      .catch(() => setError('Failed to load the sectors dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  // Touchpoints per client: logged activities plus completed calendar meetings
  const touches = new Map();
  function addTouch(clientId, date) {
    const cur = touches.get(clientId) || { count: 0, last: null };
    cur.count += 1;
    if (!cur.last || date > cur.last) cur.last = date;
    touches.set(clientId, cur);
  }
  activities.forEach((a) => addTouch(a.client_id, a.activity_date.slice(0, 10)));
  meetings
    .filter((m) => m.status === 'Completed')
    .forEach((m) => addTouch(m.client_id, m.meeting_date.slice(0, 10)));

  const money = new Map();
  sales.forEach((s) => {
    const cur = money.get(s.client_id) || { revenue: 0, deals: 0 };
    cur.revenue += Number(s.commission);
    cur.deals += 1;
    money.set(s.client_id, cur);
  });

  const groupMap = new Map();
  clients.forEach((c) => {
    const key = c.sector || NO_SECTOR;
    if (!groupMap.has(key)) groupMap.set(key, []);
    const t = touches.get(c.id) || { count: 0, last: null };
    const m = money.get(c.id) || { revenue: 0, deals: 0 };
    groupMap.get(key).push({
      id: c.id,
      name: c.display_name,
      touchpoints: t.count,
      last: t.last,
      revenue: m.revenue,
      deals: m.deals,
    });
  });

  const groups = Array.from(groupMap.entries())
    .map(([name, list]) => ({
      name,
      list,
      entities: list.length,
      touched: list.filter((x) => x.touchpoints > 0).length,
      touchpoints: list.reduce((a, x) => a + x.touchpoints, 0),
      revenue: list.reduce((a, x) => a + x.revenue, 0),
    }))
    .sort((a, b) => {
      if (a.name === NO_SECTOR) return 1;
      if (b.name === NO_SECTOR) return -1;
      return b.entities - a.entities;
    });

  const totalTouchpoints = groups.reduce((a, g) => a + g.touchpoints, 0);
  const sectorsInUse = groups.filter((g) => g.name !== NO_SECTOR).length;
  const unassigned = groups.find((g) => g.name === NO_SECTOR)?.entities || 0;

  const chartData = groups.map((g) => ({ name: g.name, Entities: g.entities, Touchpoints: g.touchpoints }));
  const active = groups.find((g) => g.name === selected) || null;

  const kpis = [
    { label: 'Total entities', value: clients.length, icon: Users, color: 'var(--accent)', soft: 'var(--accent-soft)' },
    { label: 'Sectors in use', value: sectorsInUse, icon: Layers, color: 'var(--success)', soft: 'var(--success-soft)' },
    { label: 'Without a sector', value: unassigned, icon: AlertCircle, color: 'var(--warning)', soft: 'var(--warning-soft)' },
    { label: 'Total touchpoints', value: totalTouchpoints, icon: Activity, color: 'var(--accent)', soft: 'var(--accent-soft)' },
  ];

  if (clients.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 text-center text-sm text-[var(--text-muted)]">
        Add clients and assign them sectors to see this dashboard.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: k.soft }}>
                <Icon size={20} style={{ color: k.color }} />
              </div>
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">{k.label}</div>
              <div className="text-3xl font-bold text-[var(--text)] mt-1">{k.value}</div>
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="text-[var(--text)] font-semibold mb-3">Entities per sector</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((g) => {
            const color = colorFor(g.name);
            const coverage = g.entities ? Math.round((g.touched / g.entities) * 100) : 0;
            const isSelected = selected === g.name;
            return (
              <button
                key={g.name}
                onClick={() => setSelected(isSelected ? null : g.name)}
                className="text-left bg-[var(--surface)] rounded-2xl p-5 border transition-colors hover:bg-[var(--surface-hover)]"
                style={{ borderColor: isSelected ? color : 'var(--border)' }}
              >
                <span
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap"
                  style={{ color, backgroundColor: `${color}22` }}
                >
                  {g.name}
                </span>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-bold text-[var(--text)]">{g.entities}</span>
                  <span className="text-sm text-[var(--text-muted)]">{g.entities === 1 ? 'entity' : 'entities'}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-3">
                  <span className="text-[var(--text)] font-medium">{g.touched}</span> of {g.entities} contacted
                  {' · '}
                  <span className="text-[var(--text)] font-medium">{g.touchpoints}</span> touchpoints
                </div>
                <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full" style={{ width: `${coverage}%`, backgroundColor: color }} />
                </div>
                <div className="text-xs font-mono text-[var(--text-muted)] mt-3">{fmtRWF(g.revenue)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <h4 className="text-[var(--text)] font-semibold mb-4">Entities vs touchpoints</h4>
        <ResponsiveContainer width="100%" height={Math.max(240, groups.length * 48)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis type="category" dataKey="name" width={140} stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text)' }}
              cursor={{ fill: 'var(--surface-hover)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Entities" fill="#6366F1" radius={[0, 4, 4, 0]} />
            <Bar dataKey="Touchpoints" fill="#10B981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {active ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[var(--text)] font-semibold">{active.name}: entities</h4>
            <button onClick={() => setSelected(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate" style={{ borderSpacing: '0 4px' }}>
              <thead>
                <tr className="text-left text-[var(--text-muted)] text-xs uppercase">
                  <th className="pb-2 pr-4 font-medium">Entity</th>
                  <th className="pb-2 pr-4 font-medium text-right">Touchpoints</th>
                  <th className="pb-2 pr-4 font-medium">Last contact</th>
                  <th className="pb-2 pr-4 font-medium text-right">Deals</th>
                  <th className="pb-2 pr-4 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {active.list
                  .slice()
                  .sort((a, b) => {
                    if (!a.last && b.last) return -1;
                    if (a.last && !b.last) return 1;
                    return (a.last || '').localeCompare(b.last || '');
                  })
                  .map((c) => (
                    <tr key={c.id} className="bg-[var(--bg)] hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="py-3 px-4 rounded-l-xl text-[var(--text)] font-medium">{c.name}</td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--text-muted)]">{c.touchpoints}</td>
                      <td className="py-3 px-4">
                        {c.last ? (
                          <span className="font-mono text-[var(--text-muted)]">
                            {c.last} <span className="text-xs">({daysSince(c.last)}d ago)</span>
                          </span>
                        ) : (
                          <span className="text-[var(--warning)] bg-[var(--warning-soft)] px-2.5 py-0.5 rounded-full text-xs font-medium">Never contacted</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--text-muted)]">{c.deals}</td>
                      <td className="py-3 px-4 rounded-r-xl text-right font-mono text-[var(--text)]">{fmtRWF(c.revenue)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-xs text-[var(--text-muted)] text-center">Click a sector card to see its entities and who needs a follow-up.</div>
      )}
    </div>
  );
}