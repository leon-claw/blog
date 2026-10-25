import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from './route'
import { __resetRateLimitStore } from '@/lib/rate-limit'

beforeEach(() => __resetRateLimitStore())

describe('GET /api/status/:code', () => {
  it('[200,599] 区间：返回对应状态码', async () => {
    const res = await GET(new Request('http://localhost/api/status/404'), { params: Promise.resolve({ code: '404' }) } as never)
    expect(res.status).toBe(404)
    const data = (await res.json()) as Record<string, unknown>
    expect(data['requested']).toBe(404)
  })

  it('越界/非数字 → 400 + 说明（不整成 500）', async () => {
    for (const code of ['abc', '199', '600', '-1']) {
      const res = await GET(new Request('http://localhost/api/status/' + code), { params: Promise.resolve({ code }) } as never)
      expect(res.status).toBe(400)
      const data = (await res.json()) as Record<string, unknown>
      expect(String(data['error'])).toContain('http 状态码范围')
    }
  })
})
