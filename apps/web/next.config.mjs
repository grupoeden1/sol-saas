/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sol/db'],

  // Exclude tiktoken from webpack bundling — it uses WASM and only runs server-side
  // (imported via @sol/db/token-counter subpath, used only in /api/chat)
  experimental: {
    serverComponentsExternalPackages: ['tiktoken'],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('tiktoken');
    }
    return config;
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.stripe.com https://economia.awesomeapi.com.br",
              "frame-src https://js.stripe.com",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

export default nextConfig
