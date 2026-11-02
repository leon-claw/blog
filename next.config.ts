import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // 存量：文章 143 页 × 高亮冷启动，默认 60s 在慢盘/杀毒扫描的机器上可能不够
  staticPageGenerationTimeout: 300,
}

export default nextConfig
