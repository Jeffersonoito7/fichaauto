export function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield */}
      <path d="M50 5 L90 20 L90 55 C90 75 72 92 50 98 C28 92 10 75 10 55 L10 20 Z"
        fill="none" stroke="url(#shieldGrad)" strokeWidth="5" strokeLinejoin="round" />
      {/* Person head */}
      <circle cx="42" cy="32" r="10" fill="#1a2e5a" />
      {/* Person body */}
      <path d="M24 62 C24 50 32 44 42 44 C52 44 60 50 60 62" fill="#1a2e5a" />
      {/* Car body */}
      <rect x="48" y="52" width="36" height="18" rx="4" fill="#1a2e5a" />
      <path d="M52 52 L56 44 L76 44 L80 52" fill="#1a2e5a" />
      <circle cx="55" cy="71" r="5" fill="#0f1e3d" />
      <circle cx="75" cy="71" r="5" fill="#0f1e3d" />
      {/* Checkmark badge */}
      <circle cx="34" cy="74" r="14" fill="#00A651" />
      <path d="M26 74 L31 80 L42 68" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <defs>
        <linearGradient id="shieldGrad" x1="10" y1="5" x2="90" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a5fa8" />
          <stop offset="60%" stopColor="#1a5fa8" />
          <stop offset="100%" stopColor="#00A651" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function LogoHorizontal({ height = 36 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <LogoIcon size={height} />
      <span style={{
        fontWeight: 900, fontSize: height * 0.55,
        letterSpacing: '0.03em', lineHeight: 1, whiteSpace: 'nowrap',
      }}>
        <span style={{ color: '#1a2e5a' }}>FICHA </span>
        <span style={{ color: '#00A651' }}>AUTO</span>
      </span>
    </div>
  )
}
