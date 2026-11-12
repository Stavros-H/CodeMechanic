/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['*.replit.dev', '*.reed.replit.dev', '127.0.0.1'],
  devIndicators: false,
  // Enable WebGL and audio context for Phaser
  experimental: {
    // Allow WebGL canvas rendering
    webVitalsAttribution: ['CLS', 'LCP'],
  },
};

module.exports = nextConfig;
