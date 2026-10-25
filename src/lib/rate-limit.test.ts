import { beforeEach, describe, expect, it } from 'vitest'
import { RATE_LIMIT_PER_MINUTE, RETRY_AFTER_SECONDS, withRateLimit, __resetRateLimitStore } from './rate-limit'

const handler = async (req: Request) => new Response('ok:' + new URL(req.url).pathname)
const reqFromIp = (ip: string, path = '/api/echo') =>
  new Request('http://localhost' + path, { headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } })

beforeEach(() => __resetRateLimitStore())

describe('withRateLimit（ 内存 token bucket，30/min/IP）', () => {
  it('常量：30 次/分钟，Retry-After 60 秒', () => {
    expect(RATE_LIMIT_PER_MINUTE).toBe(30)
    expect(RETRY_AFTER_SECONDS).toBe(60)
  })

  it('同一 IP 连打 31 次：前 30 次 200，第 31 次 429 + Retry-After', async () => {
    const wrapped = withRateLimit(handler)
    for (let i = 0; i < 30; i++) {
      const res = await wrapped(reqFromIp('203.0.113.7'))
      expect(res.status).toBe(200)
    }
    const res31 = await wrapped(reqFromIp('203.0.113.7'))
    expect(res31.status).toBe(429)
    expect(res31.headers.get('retry-after')).toBe('60')
  })

  it('不同 IP 相互独立', async () => {
    const wrapped = withRateLimit(handler)
    for (let i = 0; i < 30; i++) {
      expect((await wrapped(reqFromIp('198.51.100.1'))).status).toBe(200)
    }
    expect((await wrapped(reqFromIp('198.51.100.2'))).status).toBe(200)
    expect((await wrapped(reqFromIp('198.51.100.1'))).status).toBe(429)
  })

  it('无 x-forwarded-for：回退 remote 键同样受限', async () => {
    const wrapped = withRateLimit(handler)
    for (let i = 0; i < 30; i++) {
      expect((await wrapped(new Request('http://localhost/api/echo'))).status).toBe(200)
    }
    expect((await wrapped(new Request('http://localhost/api/echo'))).status).toBe(429)
  })
})
