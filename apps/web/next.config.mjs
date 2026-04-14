/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'otplib', '@otplib/core', '@otplib/preset-default'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
