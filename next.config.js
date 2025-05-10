// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // 修复实验性功能配置
  experimental: {
    serverActions: {
      allowedOrigins: ['140.116.39.84']
    }
  },
  // 添加允许的开发源
  allowedDevOrigins: ['oscepatient.duckdns.org'],
  
  // 添加 ESLint 配置
  eslint: {
    // 构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  
  // 添加 TypeScript 配置
  typescript: {
    // 构建时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
  
}

module.exports = nextConfig 