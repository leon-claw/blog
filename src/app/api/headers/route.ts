import { withRateLimit } from '@/lib/rate-limit'
import { ALLOWED_HEADER_DEMOS } from '@/lib/api-constants'

/**
 * 响应头注入演示：仅允许白名单（复现响应头注入/Retry-After 观察类 bug）。
 * 白名单外的 query 名 → 400 并回显允许名单。
 */

export const GET = withRateLimit(async (req) => {
  const q = new URL(req.url).searchParams
  const injected: Record<string, string> = {}
  for (const [k, v] of q) {
    if ((ALLOWED_HEADER_DEMOS as readonly string[]).includes(k)) injected[k] = v
    else {
      return Response.json(
        { error: `不允许注入响应头 "${k}"`, allowed: ALLOWED_HEADER_DEMOS },
        { status: 400 },
      )
    }
  }
  const headers = new Headers(injected as HeadersInit)
  return Response.json({ injected, allowed: ALLOWED_HEADER_DEMOS }, { headers })
})
