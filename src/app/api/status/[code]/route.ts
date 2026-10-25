import { withRateLimit } from '@/lib/rate-limit'

/** 返回指定 HTTP 状态码的空状态体（复现 bug 用）：范围 [200,599]，越界 400 */
export const GET = withRateLimit(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = await ctx.params
  const n = Number(code)
  if (!Number.isInteger(n) || n < 200 || n > 599) {
    return Response.json(
      { error: `invalid status code "${code}": http 状态码范围是 [200,599] 的整数`, requested: code },
      { status: 400 },
    )
  }
  return Response.json({ requested: n, message: `您请求了 ${n} 状态码` }, { status: n })
})
