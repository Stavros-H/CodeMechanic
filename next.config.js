/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['*.replit.dev', '*.reed.replit.dev', '127.0.0.1'],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '***.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Enable WebGL and audio context for Phaser
  experimental: {
    // Allow WebGL canvas rendering
    webVitalsAttribution: ['CLS', 'LCP'],
  },
};

module.exports = nextConfig;
