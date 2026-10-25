import type { Metadata } from 'next'
import { TryIt } from '@/components/TryIt'
import { API_CATALOG } from '@/lib/api-constants'
import { RATE_LIMIT_PER_MINUTE, RETRY_AFTER_SECONDS } from '@/lib/rate-limit'
import { SITE } from '@/config/site'

export const metadata: Metadata = {
  title: `接口体验场 - ${SITE.title}`,
  description: 'httpbin 风格的只读 HTTP 行为演示接口：回显、限频、延迟、跳转、缓存与注入。30 次/分钟/IP。',
}

export default function ApiPage() {
  return (
    <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-text-strong">接口体验场</h1>
      <p className="mt-3 text-text-dim">
        httpbin 风格的只读 HTTP 行为演示接口（v0）。全局约束：每 IP {RATE_LIMIT_PER_MINUTE} 次/分钟（超限{' '}
        <code className="font-mono text-xs">429 + Retry-After: {RETRY_AFTER_SECONDS}</code>）；请求体上限 1MB。点击「发送请求」即从当前页面直接探针：
      </p>
      {API_CATALOG.map((entry) => (
        <TryIt key={entry.path} label={entry.label} method={entry.method} url={entry.path} note={entry.note} />
      ))}
    </main>
  )
}
