/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
