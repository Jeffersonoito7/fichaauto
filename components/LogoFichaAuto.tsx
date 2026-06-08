import { ShieldCheck } from 'lucide-react'

// Logo horizontal: escudo + "Ficha Auto"
// theme="light"  → fundo verde (gradient-hero) + texto escuro  (para fundos brancos)
// theme="dark"   → fundo branco translúcido + texto branco     (para fundos escuros/verdes)
export function LogoHorizontal({ height = 36, theme = 'light' }: { height?: number; theme?: 'light' | 'dark' }) {
  const box  = Math.round(height * 0.95)
  const icon = Math.round(height * 0.55)
  const text = Math.round(height * 0.52)

  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-white/20 backdrop-blur-sm' : 'gradient-hero'}`}
        style={{ width: box, height: box }}
      >
        <ShieldCheck className="text-white" style={{ width: icon, height: icon }} />
      </div>
      <span
        className={`font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-brand-dark'}`}
        style={{ fontSize: text }}
      >
        Ficha Auto
      </span>
    </div>
  )
}

// Ícone isolado (só o escudo)
export function LogoIcon({ size = 36, theme = 'light' }: { size?: number; theme?: 'light' | 'dark' }) {
  const icon = Math.round(size * 0.58)
  return (
    <div
      className={`rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-white/20 backdrop-blur-sm' : 'gradient-hero'}`}
      style={{ width: size, height: size }}
    >
      <ShieldCheck className="text-white" style={{ width: icon, height: icon }} />
    </div>
  )
}
