import { useEffect, useState } from 'react';
import { getSales } from '../api/sales';

function fmtRWF(n) {
  return 'RWF ' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

export default function Services() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSales()
      .then((res) => setSales(res.data))
      .catch(() => setError('Failed to load service data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  const serviceMap = new Map();
  sales.forEach((s) => {
    if (!serviceMap.has(s.service_id)) {
      serviceMap.set(s.service_id, { id: s.service_id, name: s.service_name, totalCommission: 0, dealCount: 0, clientsSet: new Set() });
    }
    const sv = serviceMap.get(s.service_id);
    sv.totalCommission += Number(s.commission);
    sv.dealCount += 1;
    sv.clientsSet.add(s.client_name);
  });

  const serviceStats = Array.from(serviceMap.values())
    .map((sv) => ({ ...sv, clients: Array.from(sv.clientsSet), avgDeal: sv.totalCommission / sv.dealCount }))
    .sort((a, b) => b.totalCommission - a.totalCommission);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <h4 className="text-[var(--text)] font-semibold mb-5">Services, ranked by total commission</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate" style={{ borderSpacing: '0 4px' }}>
          <thead>
            <tr className="text-left text-[var(--text-muted)] text-xs uppercase">
              <th className="pb-2 pr-4 font-medium">Service</th>
              <th className="pb-2 pr-4 font-medium text-right">Total commission</th>
              <th className="pb-2 pr-4 font-medium text-right">Deals</th>
              <th className="pb-2 pr-4 font-medium text-right">Avg deal size</th>
              <th className="pb-2 pr-4 font-medium">Clients</th>
            </tr>
          </thead>
          <tbody>
            {serviceStats.map((s) => (
              <tr key={s.id} className="bg-[var(--bg)] hover:bg-[var(--surface-hover)] transition-colors">
                <td className="py-3 px-4 rounded-l-xl text-[var(--text)] font-medium">{s.name}</td>
                <td className="py-3 px-4 text-right font-mono text-[var(--text)]">{fmtRWF(s.totalCommission)}</td>
                <td className="py-3 px-4 text-right font-mono text-[var(--text-muted)]">{s.dealCount}</td>
                <td className="py-3 px-4 text-right font-mono text-[var(--text-muted)]">{fmtRWF(s.avgDeal)}</td>
                <td className="py-3 px-4 rounded-r-xl max-w-xs truncate text-[var(--text-muted)]" title={s.clients.join(', ')}>{s.clients.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}