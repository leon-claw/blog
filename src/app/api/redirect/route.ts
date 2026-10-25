import { withRateLimit } from '@/lib/rate-limit'

/**
 * 302 跳转链（复现 redirect 次数/死循环类 bug）：自身 query 递减实现链式。
 * ?to=/path 链末落地目标；?times=n 剩余跳数（默认 1）；step= 已跳次数。
 */
export const GET = withRateLimit(async (req) => {
  const url = new URL(req.url)
  const q = url.searchParams
  const rawTimes = q.get('times') ?? '1'
  const times = Number(rawTimes)
  if (!Number.isInteger(times) || times < 0) {
    return Response.json({ error: `invalid times "${rawTimes}": 需为非负整数` }, { status: 400 })
  }
  const to = q.get('to') ?? ''
  const step = Number(q.get('step') ?? '0')

  if (times <= 0) {
    return Response.json({ to, hops: step, message: to ? `浏览器将带你去 ${to}` : '链已结束' })
  }

  const next = new URL('/api/redirect', url.origin)
  if (to) next.searchParams.set('to', to)
  next.searchParams.set('times', String(times - 1))
  next.searchParams.set('step', String(step + 1))
  return new Response(null, { status: 302, headers: { location: next.pathname + '?' + next.searchParams.toString() } })
})
