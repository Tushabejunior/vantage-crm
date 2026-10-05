const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'clients', label: 'Clients' },
  { key: 'services', label: 'Services' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'ai', label: 'AI Insights' },
  { key: 'performance', label: 'Performance' },
];

export default function TabNav({ activeTab, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto mb-5 border-b border-[#28406E]">
      {TABS.map((t) => (
        <div
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#28406E] border-b-0 rounded-t-lg relative top-px
            ${activeTab === t.key
              ? 'bg-[#122247] text-white'
              : 'bg-white/[0.03] text-[#93A0C2] hover:text-white'}`}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}