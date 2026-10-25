/** 全局 API 常量（route 文件只允许导出 handler，故放 lib） */

/** /api/headers 允许注入的响应头白名单（复现响应头注入/Retry-After 观察类 bug） */
export const ALLOWED_HEADER_DEMOS = ['x-demo-retry-after', 'x-demo-ratelimit-limit', 'link', 'custom-status'] as const

/** /api/delay 上限（全局约束） */
export const DELAY_CAP_SECONDS = 10

/** /api 文档页端点目录（v0：全部只读 GET；TryIt 使用） */
export interface ApiDocEntry {
  method: 'GET'
  label: string
  path: string
  note: string
}

export const API_CATALOG: ApiDocEntry[] = [
  { method: 'GET', label: '请求回显', path: '/api/echo', note: '全量回显 method/path/query/headers/ua/body；积分表达式真身 ?raw=1 返回纯文本。POST 亦支持（TryIt 仅演示 GET）。' },
  { method: 'GET', label: '我的 IP', path: '/api/ip', note: '单行返回观测到的客户端 IP（x-forwarded-for 首段）。' },
  { method: 'GET', label: 'User-Agent', path: '/api/ua', note: '单行返回 User-Agent。' },
  { method: 'GET', label: '指定状态码', path: '/api/status/404', note: '返回 [200,599] 内任意状态码与说明体；越界回 400。可复现 502/503 等观测场景。' },
  { method: 'GET', label: '延迟响应', path: '/api/delay/2', note: '延迟 n 秒后响应（0–10 整数，超限 400），复现超时与重试。' },
  { method: 'GET', label: '跳转链', path: '/api/redirect?to=%2Fapi%2Fecho&times=2', note: '302 自链递减，?times= 控制 remaining 跳数，?to= 链末落地目标。' },
  { method: 'GET', label: 'Cookie 操作', path: '/api/cookies?op=get&k=demo', note: 'op=set|get|clear 写/读/清 Cookie，复现 cookie 丢失类 bug。' },
  { method: 'GET', label: '缓存协商', path: '/api/cache', note: '固定 Cache-Control: max-age=60 + ETag；携带 If-None-Match 可触发 304。' },
  { method: 'GET', label: '响应头注入', path: '/api/headers?x-demo-retry-after=5', note: '白名单注入响应头（x-demo-* / link / custom-status），白名单外 400。' },
]
