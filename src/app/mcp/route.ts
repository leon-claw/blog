/**
 * 博客 MCP 端点（Streamable HTTP，无状态）
 *
 * 与 mcp/server.mjs 共享同一份工具/资源实现（mcp/lib/app.mjs），
 * 让 https://jianghong.site/mcp 由 Next.js 进程直接提供，无需单独常驻
 * MCP 进程与 nginx 路由：POST 到本路由的 JSON-RPC 请求由官方 SDK 的
 * Web 标准 transport 处理。
 *
 * 测试：
 *   curl -s http://localhost:3100/mcp \
 *     -H 'Content-Type: application/json' \
 *     -H 'Accept: application/json, text/event-stream' \
 *     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
 */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { buildMcpServer } from '../../../mcp/lib/app.mjs'

export const dynamic = 'force-dynamic'

/**
 * 无状态 Streamable HTTP：每个请求独立的 transport + server 实例。
 * SDK 明确禁止跨请求复用无状态 transport（会引发消息 ID 冲突）。
 */
async function handle(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  const mcpServer = buildMcpServer()
  try {
    await mcpServer.connect(transport)
    return await transport.handleRequest(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  } finally {
    // JSON 模式下响应已写完（或失败），释放 transport 资源；server 无需单独 close
    transport.close().catch(() => {})
  }
}

export async function POST(request: Request): Promise<Response> {
  return handle(request)
}

/** 符合 Streamable HTTP 规范的 GET（SSE 流）与 DELETE（会话终止）；无状态下均为固定错误响应，但格式正确 */
export const GET = handle
export const DELETE = handle
