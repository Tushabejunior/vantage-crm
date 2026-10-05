import {
  LayoutDashboard, BookOpen, Users, Briefcase, Calendar,
  Lightbulb, Sparkles, Target, FileBarChart
} from 'lucide-react';
import VantageLogo from './VantageLogo';
import { useSettings } from '../context/SettingsContext';

const MAIN_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'ledger', label: 'Ledger', icon: BookOpen },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'services', label: 'Services', icon: Briefcase },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
];

const INSIGHT_ITEMS = [
  { key: 'opportunities', label: 'Opportunities', icon: Lightbulb },
  { key: 'ai', label: 'AI Insights', icon: Sparkles },
  { key: 'performance', label: 'Performance', icon: Target },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
];

function NavSection({ title, items, activeTab, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      {title && (
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold px-3 mb-1 mt-4">
          {title}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
              ${isActive
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'}`}
          >
            <Icon size={18} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Sidebar({ activeTab, onChange }) {
  const { settings } = useSettings();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-[var(--surface)] border-r border-[var(--border)] p-4 flex flex-col">
      <div className="flex items-center gap-2 px-2 mb-6">
        <VantageLogo size={32} />
        <span className="font-semibold text-[var(--text)] text-lg">{settings.company_name}</span>
      </div>

      <NavSection items={MAIN_ITEMS} activeTab={activeTab} onChange={onChange} />
      <NavSection title="Insights & Reports" items={INSIGHT_ITEMS} activeTab={activeTab} onChange={onChange} />
    </aside>
  );
}