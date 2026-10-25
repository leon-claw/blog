import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from './route'
import { __resetRateLimitStore } from '@/lib/rate-limit'

beforeEach(() => __resetRateLimitStore())

const call = (code: string) => GET(new Request('http://localhost/api/delay/' + code), { params: Promise.resolve({ seconds: code }) } as never)

describe('GET /api/delay/:seconds', () => {
  it('0–10 合法：delayed 回显', async () => {
    const res = await call('0') // 不真睡
    expect(res.status).toBe(200)
    expect(((await res.json()) as Record<string, unknown>)['delayed']).toBe(0)
  })

  it('11 / -1 / abc → 400 + 范围说明', async () => {
    for (const code of ['11', '-1', 'abc']) {
      const res = await call(code)
      expect(res.status).toBe(400)
      expect(String(((await res.json()) as Record<string, unknown>)['error'])).toContain('0–10')
    }
  })
})
