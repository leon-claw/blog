import { withRateLimit } from '@/lib/rate-limit'

import { DELAY_CAP_SECONDS } from '@/lib/api-constants'

export const GET = withRateLimit(async (req, ctx: { params: Promise<{ seconds: string }> }) => {
  const { seconds } = await ctx.params
  const n = Number(seconds)
  if (!Number.isInteger(n) || n < 0 || n > DELAY_CAP_SECONDS) {
    return Response.json(
      { error: `invalid seconds "${seconds}": 延迟范围是 0–${DELAY_CAP_SECONDS} 的整数`, requested: seconds },
      { status: 400 },
    )
  }
  if (n > 0) await new Promise((resolve) => setTimeout(resolve, n * 1000))
  return Response.json({ delayed: n, unit: 's' })
})
