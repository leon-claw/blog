import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from './route'
import { __resetRateLimitStore } from '@/lib/rate-limit'

beforeEach(() => __resetRateLimitStore())

describe('GET /api/cookies?op=…', () => {
  it('op=set → Set-Cookie 写入 k=v', async () => {
    const res = await GET(new Request('http://localhost/api/cookies?op=set&k=demo&v=42'))
    expect(res.headers.get('set-cookie')).toContain('demo=42')
    expect(res.headers.get('set-cookie')).toContain('Path=/')
  })

  it('op=get → 返回请求 Cookie 里的值', async () => {
    const res = await GET(new Request('http://localhost/api/cookies?op=get&k=demo', { headers: { cookie: 'demo=42; other=x' } }))
    expect(((await res.json()) as Record<string, unknown>)['value']).toBe('42')
  })

  it('op=clear → Set-Cookie 清除（Max-Age=0）', async () => {
    const res = await GET(new Request('http://localhost/api/cookies?op=clear&k=demo'))
    expect(res.headers.get('set-cookie')).toMatch(/demo=;?\s|demo=;/)
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('k/v 缺失或非法 op → 400', async () => {
    expect((await GET(new Request('http://localhost/api/cookies?op=set&k=demo'))).status).toBe(400)
    expect((await GET(new Request('http://localhost/api/cookies?op=bogus'))).status).toBe(400)
  })
})
