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
};
module.exports = nextConfig;
