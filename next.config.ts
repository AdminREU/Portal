import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['nodemailer'],
}
export default nextConfig
