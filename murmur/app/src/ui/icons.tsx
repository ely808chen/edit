const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const SoundOnIcon = () => (
  <svg {...common}>
    <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);

export const SoundOffIcon = () => (
  <svg {...common}>
    <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
    <path d="M17 9l5 6M22 9l-5 6" />
  </svg>
);

export const GearIcon = () => (
  <svg {...common}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2" />
    <circle cx="12" cy="12" r="7" />
  </svg>
);

export const FlagIcon = () => (
  <svg {...common}>
    <path d="M6 21V4" />
    <path d="M6 4.5c3-1.8 5.5 1.5 8.5 0s4-.8 4-.8v8.6s-1 .9-4 .8-5.5-1.8-8.5 0" fill="currentColor" fillOpacity="0.18" />
  </svg>
);

export const PauseIcon = () => (
  <svg {...common}>
    <rect x="7" y="6" width="3.2" height="12" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="13.8" y="6" width="3.2" height="12" rx="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const PlayIcon = () => (
  <svg {...common}>
    <path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...common}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
      fill={filled ? '#FFD36E' : 'rgba(58,46,92,0.12)'}
      stroke="#3A2E5C"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2c-4.4 0-8 3.5-8 7.8C4 16 12 22 12 22s8-6 8-12.2C20 5.5 16.4 2 12 2z" fill="#FF7A9C" stroke="#3A2E5C" strokeWidth="1.8" />
    <circle cx="12" cy="10" r="3" fill="#fff" />
  </svg>
);
