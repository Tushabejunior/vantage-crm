export default function VantageLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Vantage logo">
      <rect x="0" y="0" width="120" height="120" rx="24" fill="var(--accent)" />
      <circle cx="60" cy="60" r="36" fill="none" stroke="white" strokeWidth="5" />
      <path d="M60 36 L74 60 L60 84 L46 60 Z" fill="white" />
    </svg>
  );
}