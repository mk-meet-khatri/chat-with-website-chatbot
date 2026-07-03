/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const rawBackendUrl = process.env.BACKEND_API_URL || 'http://localhost:4000';
    const cleanBackendUrl = rawBackendUrl.replace(/\/$/, '');
    const destination = cleanBackendUrl.includes('/api/:path*')
      ? cleanBackendUrl
      : cleanBackendUrl.endsWith('/api')
        ? `${cleanBackendUrl}/:path*`
        : `${cleanBackendUrl}/api/:path*`;

    return [
      {
        source: '/api/:path*',
        destination
      }
    ];
  }
};

export default nextConfig;
