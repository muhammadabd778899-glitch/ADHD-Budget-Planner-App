export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={['brand-mark', className].filter(Boolean).join(' ')} aria-hidden="true">
      <svg viewBox="0 0 32 32" role="presentation">
        <rect x="4.4" y="18.6" width="4.8" height="8" rx="1.5" fill="#7fa9ee" opacity="0.55" />
        <rect x="11.4" y="14.2" width="4.8" height="12.4" rx="1.5" fill="#a6c5f7" opacity="0.82" />
        <rect x="18.4" y="9.2" width="4.8" height="17.4" rx="1.5" fill="#dbe9ff" />
        <path
          d="M6.3 15.4 12.9 11l5.5 2.7 5.9-6.1"
          fill="none"
          stroke="#f0d8a5"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24.5" cy="7.6" r="1.95" fill="#f0d8a5" />
      </svg>
    </span>
  );
}
