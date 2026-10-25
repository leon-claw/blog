import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from './route'
import { __resetRateLimitStore } from '@/lib/rate-limit'

beforeEach(() => __resetRateLimitStore())

describe('GET /api/redirect（302 链）', () => {
  it('首跳 Location 自链递减并带 step 标记', async () => {
    const res = await GET(new Request('http://localhost/api/redirect?to=%2Fapi%2Fecho&times=3'))
    expect(res.status).toBe(302)
    const loc = res.headers.get('location')!
    expect(loc).toContain('/api/redirect')
    expect(loc).toContain('times=2')
    expect(loc).toContain('step=1')
  })

  it('无 to 参数：Location 仍为自链（递减）', async () => {
    const res = await GET(new Request('http://localhost/api/redirect?times=2'))
    expect(res.headers.get('location')).toContain('times=1')
  })

  it('链末（times 耗尽）：200 + 汇总', async () => {
    const res = await GET(new Request('http://localhost/api/redirect?to=%2Fapi%2Fecho&times=0'))
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data['hops']).toBe(0)
    expect(data['to']).toBe('/api/echo')
  })

  it('默认 times=1；非法 times → 400', async () => {
    const res = await GET(new Request('http://localhost/api/redirect'))
    expect((res.headers.get('location') ?? '').includes('step=1')).toBe(true)
    const bad = await GET(new Request('http://localhost/api/redirect?times=abc'))
    expect(bad.status).toBe(400)
  })
})
