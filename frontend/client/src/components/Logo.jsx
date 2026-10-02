export default function Logo({ size = 28 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--accent)" />
      <path
        d="M9 11.5h14M9 16h14M9 20.5h9"
        stroke="var(--accent-ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="22.5" cy="20.5" r="2" fill="var(--accent-ink)" />
    </svg>
  );
}
