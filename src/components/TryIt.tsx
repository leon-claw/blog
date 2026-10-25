'use client'

import { useState } from 'react'

/** body 展示上限（全局约束 vendors：响应体 1MB 截断为服务端逻辑；这里仅展示层 2KB） */
export const BODY_DISPLAY_LIMIT = 2048

/** 展示的关键响应头（演示接口语义的相关头） */
const SHOWN_HEADERS = ['content-type', 'retry-after', 'location', 'etag', 'cache-control', 'set-cookie']

interface TryResult {
  status: number
  headers: [string, string][]
  body: string
  ms: number
}

/**
 * TryIt：单端点演示块（GET-only 同域探针）。点击 → fetch → status/响应头/body(≤2KB)。
 */
export function TryIt({ label, method, url, note }: { label: string; method: 'GET'; url: string; note?: string }) {
  const [result, setResult] = useState<TryResult | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    const t0 = performance.now()
    try {
      const res = await fetch(url, { method })
      let body = await res.text()
      if (body.length > BODY_DISPLAY_LIMIT) {
        body = body.slice(0, BODY_DISPLAY_LIMIT) + '\n…截断（展示上限 2KB，完整响应用 curl 查看）'
      }
      const headers: [string, string][] = []
      for (const name of SHOWN_HEADERS) {
        const value = res.headers.get(name)
        if (value !== null) headers.push([name, value])
      }
      setResult({ status: res.status, headers, body, ms: Math.round(performance.now() - t0) })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-4 rounded-[var(--radius-box)] border border-border-soft p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold text-text-strong">
          <span className="mr-2 rounded bg-bg-sunken px-1.5 py-0.5 text-xs">{method}</span>
          {label}
          <code className="ml-2 text-xs font-normal text-text-dim">{url}</code>
        </h3>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-[var(--radius-box)] bg-primary px-3 py-1.5 text-xs text-white transition-colors duration-200 ease-standard hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? '请求中…' : '发送请求'}
        </button>
      </div>

      {note ? <p className="mt-1 text-xs text-text-dim">{note}</p> : null}

      {error ? <p className="mt-3 font-mono text-xs text-[#EE675C]">{error}</p> : null}

      {result ? (
        <dl data-testid="tryit-result" className="mt-3 space-y-1 font-mono text-xs text-text-dim">
          <div className="flex gap-2">
            <dt className="shrink-0">status</dt>
            <dd data-testid="tryit-status" className={result.status < 400 ? 'text-[#81C995]' : 'text-[#EE675C]'}>
              {result.status}（{result.ms}ms）
            </dd>
          </div>
          {result.headers.map(([k, v]) => (
            <div key={k}>
              <dd className="break-all">{`${k}: ${v}`}</dd>
            </div>
          ))}
          <div className="pt-1">
            <dt>body</dt>
            <dd>
              <pre
                data-testid="tryit-body"
                className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap bg-bg-sunken p-2 text-[12px] leading-relaxed"
              >
                {result.body || '（空）'}
              </pre>
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  )
}
