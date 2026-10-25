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
 * 提供的工具：
 *   search_posts  全文检索（中文子串匹配，标题/标签/正文加权）
 *   list_posts    按时间列出文章（可按标签/分类过滤、分页）
 *   get_post      读取某篇文章完整 Markdown（支持 slug 或标题）
 *   list_tags     标签清单及文章数
 *   get_site_info 站点元信息
 *
 * 提供的资源：
 *   blog://site            站点概览
 *   blog://posts/{slug}    文章 Markdown
 *
 * 数据源为 source/_posts/*.md（bin/sync-articles.mjs 同步，
 * article-src/private 私密草稿天然被排除）。
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { loadStore, listPosts, getPost, postSummary, searchPosts, siteInfo } from './lib/store.mjs'

const SERVER_NAME = 'leon-blog'
const SERVER_VERSION = '1.0.0'
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

let store = loadStore()

// --refresh <秒>：HTTP 常驻模式下定期重建索引，新文章无需重启即可被发现
if (enableHttp && refreshSec > 0) {
  setInterval(() => {
    try {
      store = loadStore()
      console.log(`[leon-blog-mcp] 索引已刷新：${store.posts.length} 篇文章`)
    } catch (err) {
      console.error('[leon-blog-mcp] 索引刷新失败（沿用旧索引）:', err.message)
    }
  }, refreshSec * 1000).unref()
}

// ---------- 工具定义（JSON Schema，供 tools/list 返回） ----------
const TOOLS = [
  {
    name: 'search_posts',
    description:
      '全文检索博客文章。支持多个空格分隔的关键词（AND 语义），中文按子串匹配。返回标题/链接/摘要/相关度。找到感兴趣的文章后用 get_post 读取全文。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词，例如 "react 性能" 或 "rust"' },
        limit: { type: 'integer', description: '返回条数，默认 10，最大 50', default: 10 },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_posts',
    description:
      '按时间倒序列出博客文章（元信息列表，不含全文）。可按标签/分类过滤、分页。用 get_post 获取某篇的完整内容。',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: '按标签精确过滤（可选），例如 "react"' },
        category: { type: 'string', description: '按分类精确过滤（可选）' },
        limit: { type: 'integer', description: '返回条数，默认 20，最大 100', default: 20 },
        offset: { type: 'integer', description: '偏移量，默认 0', default: 0 },
      },
    },
  },
  {
    name: 'get_post',
    description:
      '读取一篇博客文章的完整 Markdown 内容。参数可以是 slug（文件名去掉 .md）或文章标题。先用 search_posts / list_posts 找到目标。',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: '文章 slug（文件名去 .md）或文章标题，例如 "git" 或 "Next.js可行性调研"' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'list_tags',
    description: '列出博客所有标签及每个标签下的文章数。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_site_info',
    description: '获取站点元信息：名称/作者/URL/文章总数/时间跨度等。',
    inputSchema: { type: 'object', properties: {} },
  },
]

// ---------- 工具实现 ----------

const json = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })
const toolError = (message) => ({ content: [{ type: 'text', text: message }], isError: true })

function handleSearchPosts(params) {
  const limit = Math.min(Math.max(Number(params?.limit) || 10, 1), 50)
  const results = searchPosts(store, params?.query ?? '', { limit })
  return json({ query: params?.query, total: results.length, results })
}

function handleListPosts(params) {
  const limit = Math.min(Math.max(Number(params?.limit) || 20, 1), 100)
  const offset = Math.max(Number(params?.offset) || 0, 0)
  return json(
    listPosts(store, {
      tag: params?.tag,
      category: params?.category,
      limit,
      offset,
    }),
  )
}

function handleGetPost(params) {
  const post = getPost(store, params?.slug ?? '')
  if (!post) {
    const close = store.posts
      .filter((p) => p.slugLower.includes(String(params?.slug ?? '').toLowerCase().slice(0, 4)))
      .slice(0, 5)
      .map((p) => p.slug)
    return toolError(
      `未找到文章 "${params?.slug}"。${close.length ? `相近的 slug 有：${close.join('、')}` : '可用 search_posts 或 list_posts 先检索。'}`,
    )
  }
  const meta = JSON.stringify({ ...postSummary(post), updated: post.updated, sourceFile: post.sourceFile }, null, 2)
  return {
    content: [
      { type: 'text', text: `${meta}\n\n下面是这篇文章的完整 Markdown 原文：\n\n---\n\n` },
      { type: 'text', text: post.body },
    ],
  }
}

function handleListTags() {
  return json({ total: store.tags.length, tags: store.tags, categories: store.categories })
}

function handleSiteInfo() {
  return json(siteInfo(store))
}

const TOOL_HANDLERS = {
  search_posts: handleSearchPosts,
  list_posts: handleListPosts,
  get_post: handleGetPost,
  list_tags: handleListTags,
  get_site_info: handleSiteInfo,
}

// ---------- 资源实现 ----------

function resourceForPost(p) {
  return {
    uri: `blog://posts/${encodeURIComponent(p.slug)}`,
    name: p.title,
    title: p.title,
    description: `${p.date || ''} ${p.tags.length ? '#' + p.tags.join(' #') : ''}`.trim(),
    mimeType: 'text/markdown',
  }
}

// ---------- MCP Server 装配（每个传输实例一份） ----------

function buildMcpServer() {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {}, resources: {} },
      instructions:
        `这是 "${store.site.title}"（作者 ${store.site.author || 'Leon'}）的博客 MCP 服务，` +
        `共 ${store.posts.length} 篇中文技术文章（${store.site.language}）。` +
        '检索流程建议：search_posts 关键词搜索（支持中文）→ list_tags 看标签 → get_post 读取全文 Markdown；' +
        'list_posts 可看全量标题。每篇文章的 url 字段是基于 Hexo permalink 生成的线上地址。',
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params
    const handler = TOOL_HANDLERS[name]
    if (!handler) return toolError(`未知工具: ${name}`)
    try {
      return handler(request.params.arguments ?? {})
    } catch (err) {
      return toolError(`工具 ${name} 执行失败: ${err?.message || err}`)
    }
  })

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'blog://site',
        name: `${store.site.title} 站点概览`,
        description: '站点元信息与统计',
        mimeType: 'application/json',
      },
      ...store.posts.map(resourceForPost),
    ],
  }))

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = String(request.params?.uri || '')
    if (uri === 'blog://site') {
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(siteInfo(store), null, 2) }],
      }
    }
    const slug = decodeURIComponent(uri.replace(/^blog:\/\/posts\//, ''))
    const post = getPost(store, slug)
    if (!post) {
      throw new Error(`未找到资源: ${uri}（可用 list_posts 查看全部 slug）`)
    }
    return {
      contents: [{ uri, mimeType: 'text/markdown', text: post.body }],
    }
  })

  return server
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
