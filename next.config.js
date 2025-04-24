/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 修复实验性功能配置
  experimental: {
    serverActions: {
      allowedOrigins: ['140.116.39.84']
    }
  }
}

module.exports = nextConfig 