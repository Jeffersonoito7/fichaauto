import Image from 'next/image'

export function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/logo-icone.jpg"
      alt="Ficha Auto"
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: 6 }}
      priority
    />
  )
}

export function LogoHorizontal({ height = 36 }: { height?: number }) {
  return (
    <Image
      src="/logo-horizontal.png"
      alt="Ficha Auto"
      width={Math.round(height * 3.8)}
      height={height}
      style={{ objectFit: 'contain' }}
      priority
    />
  )
}
