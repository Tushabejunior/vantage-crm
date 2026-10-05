import { useEffect, useState } from 'react';
import { getSales } from '../api/sales';
import { getTargets, updateTarget } from '../api/targets';
import { getAppraisals, saveAppraisal, deleteAppraisal } from '../api/appraisals';
import { useAuth } from '../context/AuthContext';

function fmtRWF(n) {
  return 'RWF ' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad(n) { return String(n).padStart(2, '0'); }

function getPeriod(refDate) {
  const y = refDate.getFullYear(), m = refDate.getMonth(), day = refDate.getDate();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const ymStr = `${y}-${pad(m + 1)}`;
  if (day <= 15) {
    return { key: `${ymStr}-A`, label: `${MONTH_NAMES[m]} 1-15, ${y}`, startISO: `${ymStr}-01`, endISO: `${ymStr}-15`, daysTotal: 15, dayOfPeriod: day, monthDays: daysInMonth };
  }
  return { key: `${ymStr}-B`, label: `${MONTH_NAMES[m]} 16-${daysInMonth}, ${y}`, startISO: `${ymStr}-16`, endISO: `${ymStr}-${pad(daysInMonth)}`, daysTotal: daysInMonth - 15, dayOfPeriod: day - 15, monthDays: daysInMonth };
}

function statusOf(actual, target) {
  if (target <= 0) return 'on-target';
  if (actual >= target * 1.15) return 'ahead';
  if (actual >= target) return 'on-target';
  return 'behind';
}

function StatusStamp({ status }) {
  const config = {
    ahead: { text: 'Ahead', color: 'var(--accent)' },
    behind: { text: 'Behind', color: 'var(--danger)' },
    'on-target': { text: 'On Target', color: 'var(--success)' },
  }[status];
  return (
    <span
      className="text-xs font-mono font-semibold px-2 py-0.5 rounded border"
      style={{ color: config.color, borderColor: config.color }}
    >
      {config.text}
    </span>
  );
}

function ProgressBar({ pct, status }) {
  const color = status === 'behind' ? 'var(--danger)' : status === 'ahead' ? 'var(--accent)' : 'var(--success)';
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden mt-2">
      <div className="h-full rounded-full" style={{ width: `${clamped}%`, backgroundColor: color }} />
    </div>
  );
}

export default function Performance() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [targets, setTargets] = useState({});
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [focus, setFocus] = useState('');

  async function loadAll() {
    setLoading(true);
    try {
      const [salesRes, targetsRes, appraisalsRes] = await Promise.all([getSales(), getTargets(), getAppraisals()]);
      setSales(salesRes.data);
      setTargets(targetsRes.data);
      setAppraisals(appraisalsRes.data);
    } catch {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const now = new Date();
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const period = getPeriod(now);
  const existingAppraisal = appraisals.find((a) => a.period_key === period.key);

  useEffect(() => {
    if (existingAppraisal) {
      setWins(existingAppraisal.wins || '');
      setChallenges(existingAppraisal.challenges || '');
      setFocus(existingAppraisal.focus || '');
    } else {
      setWins(''); setChallenges(''); setFocus('');
    }
  }, [existingAppraisal?.id]);

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  const clientMap = new Map();
  sales.forEach((s) => {
    if (!clientMap.has(s.client_id)) clientMap.set(s.client_id, { dealCount: 0, servicesSet: new Set() });
    const c = clientMap.get(s.client_id);
    c.dealCount += 1;
    c.servicesSet.add(s.service_name);
  });
  const clientStats = Array.from(clientMap.values());
  const avgServicesPerClient = clientStats.length
    ? clientStats.reduce((a, c) => a + c.servicesSet.size, 0) / clientStats.length
    : 0;

  const monthSales = sales.filter((s) => s.sale_month === ym);
  const monthPaid = monthSales.filter((s) => s.date_paid);
  const monthRevenue = monthPaid.reduce((a, s) => a + Number(s.commission), 0);
  const monthAvgDeal = monthPaid.length ? monthRevenue / monthPaid.length : 0;

  const firstMonthByClient = new Map();
  sales.forEach((s) => {
    const cur = firstMonthByClient.get(s.client_id);
    if (!cur || s.sale_month < cur) firstMonthByClient.set(s.client_id, s.sale_month);
  });
  let newClientsThisMonth = 0;
  firstMonthByClient.forEach((v) => { if (v === ym) newClientsThisMonth++; });

  const clientsThisMonth = new Set(monthSales.map((s) => s.client_id));
  let repeatCount = 0;
  clientsThisMonth.forEach((id) => { if (clientMap.get(id)?.dealCount >= 2) repeatCount++; });
  const repeatRate = clientsThisMonth.size ? Math.round((repeatCount / clientsThisMonth.size) * 100) : 0;

  const kpiRows = [
    { key: 'monthlyRevenue', label: 'Monthly commission revenue', actual: monthRevenue, target: targets.monthlyRevenue || 0, kind: 'currency' },
    { key: 'avgDealSize', label: 'Average deal size', actual: monthAvgDeal, target: targets.avgDealSize || 0, kind: 'currency' },
    { key: 'newClientsPerMonth', label: 'New clients this month', actual: newClientsThisMonth, target: targets.newClientsPerMonth || 0, kind: 'number' },
    { key: 'repeatRatePct', label: 'Repeat client rate', actual: repeatRate, target: targets.repeatRatePct || 0, kind: 'percent' },
    { key: 'crossSellDepth', label: 'Cross-sell depth', actual: avgServicesPerClient, target: targets.crossSellDepth || 0, kind: 'decimal' },
  ];

  function displayVal(kind, v) {
    if (kind === 'currency') return fmtRWF(v);
    if (kind === 'percent') return `${Math.round(v)}%`;
    if (kind === 'decimal') return v.toFixed(1);
    return Math.round(v);
  }

  async function handleTargetChange(key, value) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    try {
      await updateTarget(key, num);
      setTargets((t) => ({ ...t, [key]: num }));
    } catch {
      alert('Failed to update target');
    }
  }

  const periodSales = sales.filter((s) => s.date_paid && s.date_paid.slice(0, 10) >= period.startISO && s.date_paid.slice(0, 10) <= period.endISO);
  const periodRevenue = periodSales.reduce((a, s) => a + Number(s.commission), 0);
  const proratedTarget = ((targets.monthlyRevenue || 0) * period.daysTotal) / period.monthDays;

  async function handleSaveAppraisal() {
    try {
      await saveAppraisal({
        period_key: period.key,
        period_label: period.label,
        revenue_snapshot: periodRevenue,
        deal_count_snapshot: periodSales.length,
        target_snapshot: proratedTarget,
        wins, challenges, focus,
      });
      loadAll();
    } catch {
      alert('Failed to save appraisal');
    }
  }

  async function handleDeleteAppraisal(id) {
    try {
      await deleteAppraisal(id);
      loadAll();
    } catch {
      alert('Failed to delete appraisal');
    }
  }

  const inputCls = "bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <h4 className="text-[var(--text)] font-semibold mb-4">KPI targets & progress</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiRows.map((k) => {
            const status = statusOf(k.actual, k.target);
            const pct = k.target > 0 ? (k.actual / k.target) * 100 : 0;
            return (
              <div key={k.key} className="border border-[var(--border)] rounded-xl p-4">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs text-[var(--text-muted)] font-semibold">{k.label}</span>
                  <StatusStamp status={status} />
                </div>
                <div className="text-xl font-semibold text-[var(--text)] font-mono mt-1">{displayVal(k.kind, k.actual)}</div>
                <ProgressBar pct={pct} status={status} />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-[var(--text-muted)]">Target</span>
                  {isAdmin ? (
                    <input
                      type="number"
                      step="any"
                      defaultValue={k.target}
                      onBlur={(e) => handleTargetChange(k.key, e.target.value)}
                      className={`${inputCls} py-0.5 px-2 text-xs w-20 text-right`}
                    />
                  ) : (
                    <span className="text-xs font-mono text-[var(--text)]">{displayVal(k.kind, k.target)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <h4 className="text-[var(--text)] font-semibold mb-1">15-day appraisal</h4>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Current period: <strong className="text-[var(--text)]">{period.label}</strong> — day {period.dayOfPeriod} of {period.daysTotal}
        </p>
        <div className="flex flex-wrap gap-6 items-center bg-[var(--bg)] rounded-xl p-4 mb-4">
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Confirmed revenue this period</div>
            <div className="font-mono text-[var(--text)]">{fmtRWF(periodRevenue)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Prorated target</div>
            <div className="font-mono text-[var(--text)]">{fmtRWF(proratedTarget)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Deals paid this period</div>
            <div className="font-mono text-[var(--text)]">{periodSales.length}</div>
          </div>
          <StatusStamp status={statusOf(periodRevenue, proratedTarget)} />
        </div>

        {isAdmin ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              Wins this period
              <textarea rows={2} value={wins} onChange={(e) => setWins(e.target.value)} className={inputCls} placeholder="What went well?" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              Challenges
              <textarea rows={2} value={challenges} onChange={(e) => setChallenges(e.target.value)} className={inputCls} placeholder="What got in the way?" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              Focus for next period
              <textarea rows={2} value={focus} onChange={(e) => setFocus(e.target.value)} className={inputCls} placeholder="What will you prioritize next?" />
            </label>
            <button onClick={handleSaveAppraisal} className="self-start bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
              {existingAppraisal ? 'Update appraisal' : 'Save appraisal'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Only the admin can log appraisal notes for this period.</p>
        )}
      </div>

      {appraisals.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h4 className="text-[var(--text)] font-semibold mb-3">Appraisal history</h4>
          <div className="flex flex-col gap-3">
            {appraisals.slice().sort((a, b) => b.period_key.localeCompare(a.period_key)).map((a) => (
              <div key={a.id} className="border border-[var(--border)] rounded-xl p-4 text-sm">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <strong className="text-[var(--text)]">{a.period_label}</strong>
                  <StatusStamp status={statusOf(a.revenue_snapshot, a.target_snapshot)} />
                  <span className="text-[var(--text-muted)] font-mono text-xs">{fmtRWF(a.revenue_snapshot)} / {fmtRWF(a.target_snapshot)}</span>
                  <div className="flex-1" />
                  {isAdmin && (
                    <button onClick={() => handleDeleteAppraisal(a.id)} className="text-[var(--danger)] text-xs">Delete</button>
                  )}
                </div>
                {a.wins && <p className="text-[var(--text-muted)]"><span className="text-[var(--text)] font-semibold">Wins: </span>{a.wins}</p>}
                {a.challenges && <p className="text-[var(--text-muted)]"><span className="text-[var(--text)] font-semibold">Challenges: </span>{a.challenges}</p>}
                {a.focus && <p className="text-[var(--text-muted)]"><span className="text-[var(--text)] font-semibold">Focus next: </span>{a.focus}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}