/**
 * MCP 服务装配（与传输方式无关的共享层）
 *
 * server.mjs（stdio / 独立 HTTP 进程）与 Next.js Route Handler（src/app/mcp/route.ts）
 * 共用同一份工具/资源实现，保证两端行为一致，避免逻辑漂移。
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { loadStore, listPosts, getPost, postSummary, searchPosts, siteInfo } from './store.mjs'

export const SERVER_NAME = 'leon-blog'
export const SERVER_VERSION = '1.0.0'

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

// ---------- store 管理 ----------

let store = loadStore()

/** 重建索引（--refresh 定时刷新、以及外部新文章后手动触发都走这里） */
export function refreshStore() {
  store = loadStore()
  return store.posts.length
}

export function getStore() {
  return store
}

// ---------- MCP Server 装配（每个传输实例一份） ----------

/**
 * 创建一个新的 MCP Server 实例并挂接全部工具/资源处理器。
 * 无状态 HTTP 模式下每个请求需要独立实例（SDK 要求 transport 不可跨请求复用）。
 */
export function buildMcpServer({ instructions } = {}) {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {}, resources: {} },
      instructions:
        instructions ??
        `这是 "${store.site.title}"（作者 ${store.site.author || 'Leon'}）的博客 MCP 服务，` +
          `共 ${store.posts.length} 篇中文技术文章（${store.site.language}）。` +
          '检索流程建议：search_posts 关键词搜索（支持中文）→ list_tags 看标签 → get_post 读取全文 Markdown；' +
          'list_posts 可看全量标题。每篇文章的 url 字段是线上完整地址（https://jianghong.site/posts/<slug>）。',
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
