/**
 * Leon's Blog MCP 数据层
 *
 * 从 content/posts/*.md（文章唯一数据源，本仓库直接管理；私密草稿 drafts/ 不在该目录（被 .gitignore 排除）
 * 且天然不进 MCP 索引）读取文章，提供：
 *   - front matter 解析（title/date/tags/...）
 *   - 站点 URL 规则的生成（唯一形态 /posts/:slug，根 URL 常量 DEFAULT_SITE_URL）
 *   - 中文友好的全文检索（子串匹配 + 评分）
 *   - 标签/分类/站点信息聚合
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 博客仓库根目录（mcp/lib -> mcp -> 根） */
export const BLOG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const POSTS_DIR = join(BLOG_ROOT, 'content', 'posts')
/** 站点对外根 URL（_config.yml 停用后 Next 常量唯一来源）；占位/未设一律回退默认 */
const DEFAULT_SITE_URL = 'https://jianghong.site'
const CONFIG_PATH = join(BLOG_ROOT, '_config.yml')

// ---------- 极简 YAML 解析（只覆盖本站 front matter 实际用到的子集） ----------

function unquote(v) {
  const s = v.trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

function parseScalar(v) {
  const s = v.trim()
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((x) => unquote(x)).filter((x) => x !== '')
  }
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null' || s === '~') return null
  return unquote(s)
}

/** 解析 front matter：返回 { meta, body }。仅处理顶层标量与一维列表，足够覆盖 hexo 文章 */
function parseFrontMatter(raw) {
  if (!raw.startsWith('---')) return { meta: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta: {}, body: raw }
  const fmText = raw.slice(3, end)
  const bodyStart = raw.indexOf('\n', end + 1)
  const body = bodyStart === -1 ? '' : raw.slice(bodyStart + 1)

  const meta = {}
  let currentKey = null
  for (const rawLine of fmText.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line.trim() || line.trim().startsWith('#')) continue
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (kv && !/^\s/.test(line)) {
      currentKey = kv[1]
      const value = kv[2].trim()
      meta[currentKey] = value === '' ? null : parseScalar(value)
      continue
    }
    const listItem = line.match(/^\s*-\s*(.+)$/)
    if (listItem && currentKey != null) {
      if (!Array.isArray(meta[currentKey])) {
        meta[currentKey] = meta[currentKey] == null ? [] : [String(meta[currentKey])]
      }
      meta[currentKey].push(parseScalar(listItem[1]))
    }
  }
  return { meta, body }
}

// ---------- site config（同样用极简解析读 _config.yml 顶层标量） ----------

function loadSiteConfig() {
  const cfg = {
    title: "Leon's Blog",
    subtitle: '',
    description: '',
    author: '',
    language: 'zh-CN',
    url: 'https://jianghong.site',
    permalink: '/posts/:slug',
  }
  if (!existsSync(CONFIG_PATH)) return cfg
  const text = readFileSync(CONFIG_PATH, 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!m || !(m[1] in cfg)) continue
    cfg[m[1]] = unquote(m[2]) || cfg[m[1]]
  }
  // example.com 占位（hexo 默认）与空值都视为「未设」，回退站点真实 URL
  if (!cfg.url || /example\.com/i.test(cfg.url)) cfg.url = DEFAULT_SITE_URL
  return cfg
}

// ---------- 文章解析 ----------

const DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/

function parseDateParts(s) {
  if (!s) return null
  const m = String(s).trim().match(DATE_RE)
  if (!m) return null
  const [, y, mo, d, h = '0', mi = '0'] = m
  // 用字符串拆日期，避免时区问题；ts 仅用于排序（按本地语义足够）
  const ts = new Date(+y, +mo - 1, +d, +h, +mi).getTime()
  return { year: String(+y), month: String(+mo).padStart(2, '0'), day: String(+d).padStart(2, '0'), ts }
}

/** Next.js 版 URL 规则：唯一形态 /posts/:slug（与站点 SSG generateStaticParams 同串同编码） */
/** 模拟 hexo slugize（本站 filename_case: 0，仅空格转连字符） */
function slugize(name) {
  return name.replace(/\s+/g, '-').replace(/#{2,}/g, (s) => s[0].repeat(2))
}

function buildPostUrl(site, post) {
  const slugPath = encodeURIComponent(slugize(post.slug)).replace(/%2F/g, '/')
  // 文章 front matter 里的 permalink 一律忽略：URL 由站点统一决定
  void post.meta.permalink
  return joinUrl(site.url, `/posts/${slugPath}`)
}

function joinUrl(base, path) {
  const clean = base ? String(base).replace(/\/+$/, '') : ''
  return `${clean}/${String(path).replace(/^\/+/, '')}`.replace(/\/+$/, '/')
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>\n]+>/g, ' ')
    .replace(/[#>*_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeExcerpt(body) {
  const more = body.indexOf('<!-- more -->')
  const raw = more !== -1 ? body.slice(0, more) : body
  const stripped = stripMarkdown(raw)
  const firstPara = stripped
  return firstPara.length > 180 ? firstPara.slice(0, 177) + '...' : firstPara
}

function countWords(body) {
  const clean = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/<[^>\n]+>/g, ' ')
    .replace(/\s/g, '')
  const cjk = (clean.match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (body.replace(/```[\s\S]*?```/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return cjk + latin
}

function loadPosts(site) {
  if (!existsSync(POSTS_DIR)) {
    throw new Error(`posts 目录不存在: ${POSTS_DIR}`)
  }
  const posts = []
  for (const file of readdirSync(POSTS_DIR)) {
    if (!file.endsWith('.md')) continue
    const abs = join(POSTS_DIR, file)
    const raw = readFileSync(abs, 'utf8')
    const { meta, body } = parseFrontMatter(raw)
    // 草稿保护：layout: draft / published: false 的不对外暴露
    const layout = String(meta.layout || '').toLowerCase()
    if (layout === 'draft' || meta.published === false) continue
    const slug = file.replace(/\.md$/, '')
    const date = meta.date ?? meta.updated ?? null
    const tags = normalizeList(meta.tags)
    const categories = normalizeList(meta.categories)
    const dateParts = parseDateParts(date)
    posts.push({
      slug,
      slugLower: slug.toLowerCase(),
      title: String(meta.title ?? slug),
      titleLower: String(meta.title ?? slug).toLowerCase(),
      date,
      updated: meta.updated ?? null,
      dateParts,
      ts: dateParts ? dateParts.ts : -1,
      tags,
      tagsLower: tags.map((t) => t.toLowerCase()),
      categories,
      categoriesLower: categories.map((c) => c.toLowerCase()),
      url: buildPostUrl(site, { slug, meta, dateParts }),
      wordCount: countWords(body),
      excerpt: makeExcerpt(body),
      body,
      bodyLower: body.toLowerCase(),
      sourceFile: abs,
    })
  }
  posts.sort((a, b) => b.ts - a.ts) // 新文章在前
  return posts
}

function normalizeList(v) {
  if (v == null) return []
  if (Array.isArray(v)) return v.map(String)
  return String(v).split(/[,，]/).map((s) => s.trim()).filter(Boolean)
}

// ---------- 构建索引 ----------

export function loadStore() {
  const site = loadSiteConfig()
  const posts = loadPosts(site)

  const tagCounts = new Map()
  const categoryCounts = new Map()
  for (const p of posts) {
    for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
    for (const c of p.categories) categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1)
  }

  return {
    site,
    posts,
    tags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    categories: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
  }
}

// ---------- 查询 API ----------

export function listPosts(store, { tag, category, limit = 20, offset = 0 } = {}) {
  let posts = store.posts
  if (tag) {
    const t = String(tag).toLowerCase()
    posts = posts.filter((p) => p.tagsLower.includes(t))
  }
  if (category) {
    const c = String(category).toLowerCase()
    posts = posts.filter((p) => p.categoriesLower.includes(c))
  }
  const total = posts.length
  const page = posts
    .slice(offset, offset + limit)
    .map((p) => ({ ...postSummary(p), excerpt: p.excerpt }))
  return { total, offset, returned: page.length, posts: page }
}

export function postSummary(p) {
  return {
    title: p.title,
    slug: p.slug,
    date: p.date,
    tags: p.tags,
    categories: p.categories,
    url: p.url,
    wordCount: p.wordCount,
  }
}

export function getPost(store, slugOrTitle) {
  const q = String(slugOrTitle).trim()
  const qLower = q.toLowerCase()
  const bySlug = (p) => p.slugLower === qLower
  const byTitle = (p) => p.titleLower === qLower
  let post = store.posts.find(bySlug) || store.posts.find(byTitle)
  if (!post) {
    // 再给一次模糊机会：包含匹配
    post = store.posts.find((p) => p.slugLower.includes(qLower) && qLower.length >= 4)
  }
  return post || null
}

function countOf(haystack, needle) {
  let n = 0
  let i = haystack.indexOf(needle)
  while (i !== -1) {
    n++
    i = haystack.indexOf(needle, i + needle.length)
  }
  return n
}

function makeSnippet(body, index, radius = 110) {
  const start = Math.max(0, index - radius)
  const end = Math.min(body.length, index + radius + 30)
  let text = body.slice(start, end)
  if (start > 0) text = '...' + text
  if (end < body.length) text += '...'
  return text.replace(/\s+/g, ' ').trim()
}

/** 全文检索：多关键词 AND，标题 > 标签 > 正文 加权，中文按子串命中 */
export function searchPosts(store, query, { limit = 10 } = {}) {
  const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  const results = []
  for (const p of store.posts) {
    let score = 0
    let bodyIndex = -1
    let matched = true
    for (const term of terms) {
      const inTitle = countOf(p.titleLower, term)
      const inTags = countOf(p.tagsLower.join(' '), term)
      const inBody = countOf(p.bodyLower, term)
      if (!inTitle && !inTags && !inBody) {
        matched = false
        break
      }
      score += inTitle * 12 + inTags * 8 + Math.min(inBody, 30)
      if (inBody && bodyIndex === -1) bodyIndex = p.bodyLower.indexOf(term)
    }
    if (!matched) continue
    results.push({ post: p, score, bodyIndex })
  }
  results.sort((a, b) => b.score - a.score || b.post.ts - a.post.ts)
  return results.slice(0, limit).map(({ post, score, bodyIndex }) => ({
    ...postSummary(post),
    score,
    snippet: bodyIndex === -1 ? post.excerpt : makeSnippet(post.body, bodyIndex),
  }))
}

export function siteInfo(store) {
  const { site, posts, tags, categories } = store
  return {
    name: site.title,
    subtitle: site.subtitle,
    description: site.description,
    author: site.author,
    language: site.language,
    url: site.url,
    generator: `Hexo (theme: keep)`,
    postsDir: POSTS_DIR,
    postCount: posts.length,
    tagCount: tags.length,
    categoryCount: categories.length,
    dateRange: posts.length
      ? { oldest: posts[posts.length - 1].date, newest: posts[0].date }
      : null,
    note: posts.length && posts[0].url.startsWith('/')
      ? '_config.yml 的 url 还是占位符，文章 url 为站内相对路径；配置真实域名后自动变外链。私密草稿目录 private/ 已排除。'
      : '私密草稿目录 private/ 已被排除，不会出现在本服务中。',
  }
}
