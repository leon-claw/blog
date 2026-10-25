import { withRateLimit } from '@/lib/rate-limit'

/** 单行返回 User-Agent */
export const GET = withRateLimit(async (req) => {
  return new Response((req.headers.get('user-agent') ?? '') + '\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
})
