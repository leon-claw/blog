import { withRateLimit } from '@/lib/rate-limit'

const MAX_BODY_BYTES = 1024 * 1024 // 全局约束：1MB 截断

interface EchoPayload {
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  ua: string | null
  body?: string
}

async function echo(req: Request, wantRaw: boolean): Promise<Response> {
  const url = new URL(req.url)
  const payload: EchoPayload = {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(req.headers),
    ua: req.headers.get('user-agent'),
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const buf = await req.arrayBuffer()
    payload.body = buf.byteLength > MAX_BODY_BYTES ? Buffer.from(buf, 0, MAX_BODY_BYTES).toString() : Buffer.from(buf).toString()
  }
  if (wantRaw || payload.query['raw'] === '1') {
    const lines = [
      `${payload.method} ${payload.path}`,
      ...Object.entries(payload.headers).map(([k, v]) => `${k}: ${v}`),
      '',
      payload.body ?? '',
    ]
    return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
  return Response.json(payload)
}

export const GET = withRateLimit((req) => echo(req, false))
export const POST = withRateLimit((req) => echo(req, false))
