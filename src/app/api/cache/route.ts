import { createHash } from 'node:crypto'
import { withRateLimit } from '@/lib/rate-limit'

/** 固定 max-age=60 + ETag；命中 If-None-Match → 304（复现缓存协商 bug 用） */
const PAYLOAD = { cache: 'demo', fixedAt: 'build-time-constant' }
const ETAG = '"' + createHash('sha1').update(JSON.stringify(PAYLOAD)).digest('hex').slice(0, 16) + '"'

export const GET = withRateLimit(async (req) => {
  const inm = req.headers.get('if-none-match')
  if (inm && inm.split(',').map((s) => s.trim()).includes(ETAG)) {
    return new Response(null, { status: 304, headers: { etag: ETAG, 'cache-control': 'max-age=60' } })
  }
  return Response.json(PAYLOAD, { headers: { etag: ETAG, 'cache-control': 'max-age=60' } })
})
