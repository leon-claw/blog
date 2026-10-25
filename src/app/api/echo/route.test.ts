import { beforeEach, describe, expect, it } from 'vitest'
import { GET, POST } from './route'
import { __resetRateLimitStore } from '@/lib/rate-limit'

beforeEach(() => __resetRateLimitStore())

describe('GET /api/echo（query 回显）…', () => {
  it('回显 method/path/query/headers/ua', async () => {
    const res = await GET(new Request('http://localhost/api/echo?a=1&b=%E4%B8%AD', { headers: { 'user-agent': 'TestAgent/1.0', 'x-forwarded-for': '192.0.2.9' } }))
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data['method']).toBe('GET')
    expect(data['path']).toBe('/api/echo')
    expect(data['query']).toEqual({ a: '1', b: '中' })
    expect((data['ua'] as string)).toBe('TestAgent/1.0')
    const headers = data['headers'] as Record<string, string>
    expect(headers['user-agent']).toBe('TestAgent/1.0')
  })

  it('?raw=1 → 纯文本响应', async () => {
    const res = await GET(new Request('http://localhost/api/echo?raw=1', { headers: { 'user-agent': 'RawAgent' } }))
    expect(res.headers.get('content-type')).toContain('text/plain')
    const text = await res.text()
    expect(text).toContain('GET /api/echo')
    expect(text).toContain('RawAgent')
  })
})

describe('POST /api/echo（body 回显，1MB 截断）', () => {
  it('JSON body 逐字段照发', async () => {
    const res = await POST(new Request('http://localhost/api/echo', { method: 'POST', body: '{"hello":"world"}', headers: { 'content-type': 'application/json' } }))
    const data = (await res.json()) as Record<string, unknown>
    expect(data['body']).toBe('{"hello":"world"}')
    expect((data['headers'] as Record<string, string>)['content-type']).toBe('application/json')
  })
})
