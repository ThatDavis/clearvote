import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/adapter-pg', '@prisma/client'],
}

export default nextConfig
