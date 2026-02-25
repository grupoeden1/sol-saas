/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sol/db'],

  // Configurações de otimização
  swcMinify: true,

  // Experimental features
  experimental: {
    // Ativar quando necessário
  },
}

export default nextConfig
