import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import matter from 'gray-matter'

/**
 * 文章索引（spec §7）。数据源 `content/posts/*.md`（仅根层级文件；
 * `private/` 等子目录在同步阶段已被排除，此处双保险再过滤一次）。
 * POSTS_SRC 环境变量可覆盖数据目录（测试用 fixtures）。
 */
export interface Post {
  /** URL 段＝文件名去 .md（中文原样，路由层自行 encode） */
  slug: string
  title: string
  /** 'YYYY-MM-DD HH:mm:ss'，可按字典序比较 */
  date: string
  updated: string
  tags: string[]
  /** markdown 原文（去 front-matter），渲染在 lib/markdown */
  content: string
}

export interface TagGroup {
  tag: string
  count: number
}

export interface Paginated {
  posts: Post[]
  page: number
  pages: number
  total: number
}

/** 全局约束：每页 10 篇 */
export const PAGINATION_SIZE = 10

function postsDir(): string {
  return process.env.POSTS_SRC ?? path.resolve(process.cwd(), 'content/posts')
}

/** front-matter 缺失时：title 取文件名；date 取 git 首次提交时间，再退回 mtime */
function gitFirstCommitDate(file: string): string | null {
  try {
    const out = execFileSync('git', ['log', '--follow', '--diff-filter=A', '--format=%aI', '--', file], {
      cwd: path.dirname(file),
    })
      .toString()
      .trim()
      .split('\n')
      .pop()
    return out && /^\d{4}-/.test(out) ? out : null
  } catch {
    return null
  }
}

function normalizeDate(input: unknown, fallback: Date): string {
  const d = input instanceof Date ? input : typeof input === 'string' && input.trim() ? new Date(input) : fallback
  if (Number.isNaN(d.getTime())) return toStamp(fallback)
  return toStamp(d)
}

function toStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function getAllPosts(): Post[] {
  const dir = postsDir()
  if (!fs.existsSync(dir)) return []
  const posts: Post[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // 仅根层级 .md；任何子目录（含 private/）永不进索引
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const file = path.join(dir, entry.name)
    const slug = entry.name.slice(0, -3)
    const stat = fs.statSync(file)
    const fallbackDate = gitFirstCommitDate(file) ?? null
    const parsed = matter(fs.readFileSync(file, 'utf8'))
    const fm = parsed.data as {
      title?: unknown
      date?: unknown
      updated?: unknown
      tags?: unknown
      categories?: unknown
    }
    const fmTags = (Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : []).map(String)
    const fmCats = (Array.isArray(fm.categories) ? fm.categories : fm.categories ? [fm.categories] : []).map(String)
    const tags: string[] = [...fmTags, ...fmCats]
    const dateStr = normalizeDate(fm.date, fallbackDate ? new Date(fallbackDate) : stat.mtime)
    posts.push({
      slug,
      title: typeof fm.title === 'string' && fm.title.trim() ? fm.title : slug,
      date: dateStr,
      updated: fm.updated ? normalizeDate(fm.updated, stat.mtime) : dateStr,
      tags,
      content: parsed.content.trim(),
    })
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.slug.localeCompare(a.slug, 'zh')))
  return posts
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}

export function getAllTags(): TagGroup[] {
  const map = new Map<string, number>()
  for (const post of getAllPosts()) {
    for (const t of post.tags) map.set(t, (map.get(t) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh'))
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((p) => p.tags.includes(tag))
}

export function paginate(all: Post[], page: number): Paginated {
  const pages = Math.max(1, Math.ceil(all.length / PAGINATION_SIZE))
  const p = Math.min(Math.max(1, Math.floor(page)), pages)
  return {
    posts: all.slice((p - 1) * PAGINATION_SIZE, p * PAGINATION_SIZE),
    page: p,
    pages,
    total: all.length,
  }
}

/** 相邻导航：prev=更早发布、next=更新发布（按 date 降序链表）；未知 slug 双 undefined */
export function getAdjacentPosts(slug: string): { prev?: Post; next?: Post } {
  const all = getAllPosts()
  const i = all.findIndex((p) => p.slug === slug)
  if (i === -1) return { prev: undefined, next: undefined }
  // prev = 更早 → 在降序列表中是 i+1；next = 更新 → i-1
  return { prev: all[i + 1], next: all[i - 1] }
}
