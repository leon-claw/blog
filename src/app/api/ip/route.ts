import { withRateLimit, clientIp } from '@/lib/rate-limit'

/** 单行返回观测到的客户端 IP（x-forwarded-for 首段 / remote） */
export const GET = withRateLimit(async (req) => {
  return new Response(clientIp(req) + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } })
})
