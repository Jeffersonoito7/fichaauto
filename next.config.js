/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Desabilita minificacao no servidor (build usa pouca RAM, sem perda funcional)
  swcMinify: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'logo.clearbit.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  async redirects() {
    return [
      // /legal existiu por algumas horas em 30/09/2026 enquanto o documento
      // unico era montado. O endereco oficial e /privacidade.
      { source: '/legal', destination: '/privacidade', permanent: true },
      // Enderecos que as pessoas tentam por habito e davam 404.
      { source: '/termos', destination: '/privacidade#termos', permanent: true },
      { source: '/termos-de-uso', destination: '/privacidade#termos', permanent: true },
      { source: '/politica-de-privacidade', destination: '/privacidade', permanent: true },
    ];
  },
};
module.exports = nextConfig;
