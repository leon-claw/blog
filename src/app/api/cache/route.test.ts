import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from './route'
import { __resetRateLimitStore } from '@/lib/rate-limit'

beforeEach(() => __resetRateLimitStore())

describe('GET /api/cache（max-age=60 + ETag/304）', () => {
  it('响应带 Cache-Control 与 ETag', async () => {
    const res = await GET(new Request('http://localhost/api/cache'))
    expect(res.headers.get('cache-control')).toBe('max-age=60')
    expect(res.headers.get('etag')).toBeTruthy()
  })

  it('If-None-Match 匹配 → 304 空体', async () => {
    const first = await GET(new Request('http://localhost/api/cache'))
    const etag = first.headers.get('etag')!
    const second = await GET(new Request('http://localhost/api/cache', { headers: { 'if-none-match': etag } }))
    expect(second.status).toBe(304)
  })

  it('If-None-Match 不匹配 → 200', async () => {
    const second = await GET(new Request('http://localhost/api/cache', { headers: { 'if-none-match': '"stale"' } }))
    expect(second.status).toBe(200)
  })
})
