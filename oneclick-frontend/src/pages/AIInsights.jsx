import { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { generateInsights } from '../api/insights';
import { useAuth } from '../context/AuthContext';

export default function AIInsights() {
  const { isAdmin } = useAuth();
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await generateInsights();
      setInsight(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate insights. Make sure the Anthropic API key is set and funded.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
              <Sparkles size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <h4 className="text-[var(--text)] font-semibold">AI Insights</h4>
              <p className="text-xs text-[var(--text-muted)]">A written read on your numbers, generated from your current ledger.</p>
            </div>
          </div>
          {isAdmin ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles size={14} />
              {loading ? 'Analysing…' : insight ? 'Regenerate' : 'Generate insights'}
            </button>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Read-only — ask the admin to generate this</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Reading through your ledger…</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-[var(--danger-soft)] border border-[var(--danger)]/30 rounded-2xl p-6 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {!loading && !error && !insight && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 text-center text-[var(--text-muted)] text-sm">
          {isAdmin
            ? 'No insights generated yet — click "Generate insights" above.'
            : 'No insights have been generated yet.'}
        </div>
      )}

      {insight && !loading && (
        <>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <div className="text-xs text-[var(--text-muted)] mb-2">
              Generated {new Date(insight.generatedAt).toLocaleString()}
            </div>
            <p className="text-lg text-[var(--text)] font-medium leading-relaxed">{insight.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
              <h5 className="flex items-center gap-2 text-sm font-semibold text-[var(--success)] uppercase tracking-wide mb-4">
                <TrendingUp size={16} /> Strengths
              </h5>
              <ul className="flex flex-col gap-3">
                {insight.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-[var(--text)] flex gap-2">
                    <span className="text-[var(--success)] mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
              <h5 className="flex items-center gap-2 text-sm font-semibold text-[var(--danger)] uppercase tracking-wide mb-4">
                <AlertTriangle size={16} /> Risks
              </h5>
              <ul className="flex flex-col gap-3">
                {insight.risks.map((r, i) => (
                  <li key={i} className="text-sm text-[var(--text)] flex gap-2">
                    <span className="text-[var(--danger)] mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h5 className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">
              <Lightbulb size={16} /> Recommended next moves
            </h5>
            <div className="flex flex-col gap-3">
              {insight.recommendations.map((r, i) => (
                <div key={i} className="border-l-2 pl-3" style={{ borderColor: 'var(--accent)' }}>
                  <div className="text-sm font-semibold text-[var(--text)]">{i + 1}. {r.title}</div>
                  <div className="text-sm text-[var(--text-muted)] mt-0.5">{r.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}