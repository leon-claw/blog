import { withRateLimit } from '@/lib/rate-limit'

/** 写/读/清 Cookie（复现 cookie 十字架类 bug）：?op=set|get|clear&k=&v= */
function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of header?.split(';') ?? []) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export const GET = withRateLimit(async (req) => {
  const q = new URL(req.url).searchParams
  const op = q.get('op') ?? 'get'
  const k = q.get('k')
  if (!k) return Response.json({ error: '缺少 k 参数' }, { status: 400 })

  if (op === 'set') {
    const v = q.get('v')
    if (v === null) return Response.json({ error: 'op=set 需要 v 参数' }, { status: 400 })
    return Response.json(
      { op, k, v },
      { headers: { 'set-cookie': `${k}=${encodeURIComponent(v)}; Path=/` } },
    )
  }
  if (op === 'get') {
    return Response.json({ op, k, value: parseCookies(req.headers.get('cookie'))[k] ?? null })
  }
  if (op === 'clear') {
    return Response.json(
      { op, k, cleared: true },
      { headers: { 'set-cookie': `${k}=; Path=/; Max-Age=0` } },
    )
  }
  return Response.json({ error: `未知 op "${op}"：允许 set/get/clear` }, { status: 400 })
})
