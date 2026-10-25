import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from './route'
import { ALLOWED_HEADER_DEMOS } from '@/lib/api-constants'
import { __resetRateLimitStore } from '@/lib/rate-limit'

beforeEach(() => __resetRateLimitStore())

describe('GET /api/headers（响应头白名单注入）', () => {
  it('白名单头按 query 注入响应', async () => {
    const res = await GET(new Request('http://localhost/api/headers?x-demo-retry-after=5&x-demo-ratelimit-limit=30'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-demo-retry-after')).toBe('5')
    expect(res.headers.get('x-demo-ratelimit-limit')).toBe('30')
  })

  it('白名单外名字 → 400 + 允许名单', async () => {
    const res = await GET(new Request('http://localhost/api/headers?not-allowed=1'))
    expect(res.status).toBe(400)
    const data = (await res.json()) as Record<string, unknown>
    expect(Array.isArray(data['allowed'])).toBe(true)
    for (const name of ALLOWED_HEADER_DEMOS) expect((data['allowed'] as string[])).toContain(name)
  })

  it('无 query：200 空注入说明', async () => {
    const res = await GET(new Request('http://localhost/api/headers'))
    expect(res.status).toBe(200)
  })
})
