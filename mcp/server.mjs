#!/usr/bin/env node
/**
 * Leon's Blog MCP Server
 *
 * 把博客内容暴露为 MCP (Model Context Protocol) 服务，供 AI Agent 检索。
 *
 * 用法：
 *   node mcp/server.mjs                 # stdio 模式（Claude Desktop / Cursor / VS Code / Claude Code）
 *   node mcp/server.mjs --http          # Streamable HTTP 模式，http://127.0.0.1:8787/mcp（本地调试）
 *   node mcp/server.mjs --http --port 3000 --host 0.0.0.0   # 远程 Agent 部署（配合 systemd/docker）
 *   node mcp/server.mjs --http --refresh 300                # 每 300s 重建索引，新文章无需重启自动可见
 *   node mcp/server.mjs --http --token xxxx                  # 要求 Authorization: Bearer xxxx（客户端配 headers）
 *
 * 工具/资源定义见 mcp/lib/app.mjs（与 Next.js 集成端点 src/app/mcp/route.ts 共享同一份）。
 *
 * 数据源为 content/posts/*.md（本仓库直接管理；私密草稿 drafts/ 天然被排除）。
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { postSummary } from './lib/store.mjs'
import { buildMcpServer, refreshStore, getStore } from './lib/app.mjs'

export { SERVER_NAME, SERVER_VERSION } from './lib/app.mjs'

const DEFAULT_HTTP_PORT = 8787

// ---------- CLI 参数 ----------
const args = process.argv.slice(2)
function argValue(flag, fallback) {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
const enableHttp = args.includes('--http')
const httpPort = Number(argValue('--port', DEFAULT_HTTP_PORT))
const httpHost = argValue('--host', '127.0.0.1')
const basePath = argValue('--path', '/mcp')
const bearerToken = argValue('--token', '') || (args.includes('--token') ? 'PleaseConfigureTokenInArguments' : '')
const refreshSec = Number(argValue('--refresh', 0))

let store = getStore()

// --refresh <秒>：HTTP 常驻模式下定期重建索引，新文章无需重启即可被发现
if (enableHttp && refreshSec > 0) {
  setInterval(() => {
    try {
      const count = refreshStore()
      store = getStore()
      console.log(`[leon-blog-mcp] 索引已刷新：${count} 篇文章`)
    } catch (err) {
      console.error('[leon-blog-mcp] 索引刷新失败（沿用旧索引）:', err.message)
    }
  }, refreshSec * 1000).unref()
}

// ---------- stdio 模式 ----------

async function startStdio() {
  const server = buildMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write(`[leon-blog-mcp] stdio 模式已启动：${store.posts.length} 篇文章已索引\n`)
}

// ---------- Streamable HTTP 模式（无状态） ----------

async function startHttp() {
  const http = await import('node:http')

  const httpServer = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname
    if (pathname !== basePath) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32601, message: `Not found, MCP endpoint is ${basePath}` } }))
      return
    }
    // 可选 Bearer 鉴权（--token 启用；Cursor / VS Code / Claude Code 均支持配置自定义 header）
    if (bearerToken && req.headers.authorization !== `Bearer ${bearerToken}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized: send header "Authorization: Bearer <token>"' } }))
      return
    }
    try {
      let parsedBody
      if (req.method === 'POST') {
        const chunks = []
        let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > 2 * 1024 * 1024) {
            res.writeHead(413, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Payload too large' } }))
            return
          }
          chunks.push(chunk)
        }
        try {
          parsedBody = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Invalid JSON' } }))
          return
        }
      }
      // 无状态模式：每个请求独立的 transport + server 实例
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
      const mcpServer = buildMcpServer()
      res.on('close', () => {
        transport.close()
        mcpServer.close()
      })
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res, parsedBody)
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
      }
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: String(err?.message || err) } }))
    }
  })

  httpServer.listen(httpPort, httpHost, () => {
    const addr = httpServer.address()
    const port = typeof addr === 'object' ? addr.port : httpPort
    console.log(`[leon-blog-mcp] HTTP 模式已启动: http://${httpHost === '0.0.0.0' ? 'localhost' : httpHost}:${port}${basePath}`)
    console.log(`[leon-blog-mcp] 已索引 ${store.posts.length} 篇文章`)
    console.log(`[leon-blog-mcp] Agent 客户端配置示例（VS Code / Claude Code）:`)
    console.log(`  { "url": "http://localhost:${port}${basePath}" }`)
  })
}

const main = enableHttp ? startHttp : startStdio
main().catch((err) => {
  console.error('[leon-blog-mcp] 启动失败:', err)
  process.exit(1)
})

// postSummary 被 app.mjs 引用链隐式使用；此处仅为保持 re-export 兼容旧引用
void postSummary
