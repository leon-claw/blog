/**
 * 全局约束（spec）：只读 API，30 次/分/IP，超限 429 + Retry-After。
 * 内存 token bucket（固定窗口）：单 Node 进程部署形态下足够（不引入 Redis）。
 * 代理链路取 x-forwarded-for 首段，无头时退 'remote'。
 */
export const RATE_LIMIT_PER_MINUTE = 30
export const RETRY_AFTER_SECONDS = 60
const WINDOW_MS = 60_000

const buckets = new Map<string, number[]>()

export function __resetRateLimitStore(): void {
  buckets.clear()
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  return xff ? xff.split(',')[0]!.trim() : 'remote'
}

/**
 * 泛型包装：保留第二个参数（Next 15 路由上下文，如 { params: Promise<...> }），
 * echo/ip/ua 这类无 ctx 路由也走同一封装。
 */
export function withRateLimit<C = unknown>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const key = clientIp(req)
    const now = Date.now()
    const bucket = (buckets.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS)
    if (bucket.length >= RATE_LIMIT_PER_MINUTE) {
      return Response.json(
        { error: `rate limited: ${RATE_LIMIT_PER_MINUTE} req/min per IP`, retryAfterSeconds: RETRY_AFTER_SECONDS },
        { status: 429, headers: { 'retry-after': String(RETRY_AFTER_SECONDS) } },
      )
    }
    bucket.push(now)
    buckets.set(key, bucket)
    return handler(req, ctx)
  }
}
