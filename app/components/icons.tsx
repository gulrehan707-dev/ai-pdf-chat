type IconProps = React.SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pl-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b7cff" />
          <stop offset="100%" stopColor="#b45af2" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#pl-mark)" />
      <path
        d="M12 9.5h5.2L21 13.3V22a1.5 1.5 0 0 1-1.5 1.5H12A1.5 1.5 0 0 1 10.5 22V11A1.5 1.5 0 0 1 12 9.5Z"
        fill="none"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M17 9.5V13a.5.5 0 0 0 .5.5H21" stroke="white" strokeWidth="1.6" fill="none" />
      <circle cx="15.6" cy="17.4" r="2.6" stroke="white" strokeWidth="1.6" fill="none" />
      <path d="m17.6 19.4 2.2 2.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function UploadCloud(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
      <path d="M20 16.5A3.5 3.5 0 0 0 18 10a6 6 0 0 0-11.6 1.5A3.75 3.75 0 0 0 7 19h1" />
      <path d="M16 19h1.5" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" />
      <path d="M13.5 3v4.5a1 1 0 0 0 1 1H19" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12h15M12 4.5 19.5 12 12 19.5" />
    </svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.1 10.2 12.6 4.5 10.8 10.2 9 12 3.5Z" />
      <path d="M18.5 16.5 19.2 18.5 21 19.2 19.2 19.9 18.5 21.9 17.9 19.9 16 19.2 17.9 18.5 18.5 16.5Z" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 19 6v6c0 4.2-2.9 7.5-7 8.5-4.1-1-7-4.3-7-8.5V6l7-2.5Z" />
      <path d="m9.2 12.2 2 2 3.6-3.8" />
    </svg>
  );
}

export function QuoteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 6.5c-2.4 1-4 3.3-4 6.2V17.5h4.6v-5H7.4c0-2 .8-3.6 2.1-4.4l0-1.6Z" />
      <path d="M18.2 6.5c-2.4 1-4 3.3-4 6.2V17.5h4.6v-5h-2.7c0-2 .8-3.6 2.1-4.4l0-1.6Z" />
    </svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19.5 12h-15M9.5 6.5 4 12l5.5 5.5" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.7M12 16.1h.01" />
    </svg>
  );
}
