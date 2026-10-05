import { useEffect, useState } from 'react';
import { getOpportunities } from '../api/opportunities';
import { getClients } from '../api/clients';

const CATEGORY_LABELS = {
  risk: 'Needs attention',
  collections: 'Collections',
  growth: 'Growth & cross-sell',
  seasonal: 'Seasonal planning',
};

const CATEGORY_VARS = {
  risk: 'var(--danger)',
  collections: 'var(--warning)',
  growth: 'var(--success)',
  seasonal: 'var(--accent)',
};

const CATEGORY_ORDER = ['risk', 'collections', 'growth', 'seasonal'];

export default function Opportunities({ onSchedule }) {
  const [opportunities, setOpportunities] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getOpportunities(), getClients()])
      .then(([oppsRes, clientsRes]) => {
        setOpportunities(oppsRes.data);
        setClients(clientsRes.data);
      })
      .catch(() => setError('Failed to load opportunities'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[var(--text-muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  if (!opportunities.length) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center text-[var(--text-muted)]">
        Add a few sales entries and opportunities will appear here automatically.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {CATEGORY_ORDER.map((cat) => {
        const items = opportunities.filter((o) => o.category === cat);
        if (!items.length) return null;
        return (
          <div key={cat} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h4 className="font-semibold mb-3" style={{ color: CATEGORY_VARS[cat] }}>
              {CATEGORY_LABELS[cat]}
            </h4>
            <div className="flex flex-col gap-3">
              {items.map((o, i) => {
                const matchedClient = clients.find((c) => o.title.includes(c.display_name));
                return (
                  <div
                    key={i}
                    className="border-l-2 pl-3 flex justify-between items-start gap-3"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div>
                      <div className="text-[var(--text)] font-semibold text-sm">{o.title}</div>
                      <div className="text-[var(--text-muted)] text-sm mt-0.5">{o.detail}</div>
                    </div>
                    {matchedClient && onSchedule && (
                      <button
                        onClick={() => onSchedule(matchedClient.display_name, matchedClient.id)}
                        className="text-xs font-medium text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0"
                      >
                        Schedule
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}