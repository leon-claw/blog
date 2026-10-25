import { beforeAll, describe, expect, it } from 'vitest'
import path from 'node:path'
import { PAGINATION_SIZE, paginate, getAllPosts, getAllTags, getPostBySlug, getPostsByTag, type Post } from './posts'

const FIXTURES = path.resolve(__dirname, '../../tests/fixtures/content/posts')

describe('Post 内容索引（POSTS_SRC 指向 fixtures）', () => {
  beforeAll(() => {
    process.env.POSTS_SRC = FIXTURES
  })

  it('getAllPosts：3 篇且按 date 降序', () => {
    const posts = getAllPosts()
    expect(posts).toHaveLength(3)
    expect(posts[0]!.date >= posts[1]!.date).toBe(true)
    expect(posts[1]!.date >= posts[2]!.date).toBe(true)
  })

  it('getPostBySlug：中文 slug 原样（URL-encoding 不影响索引键）', () => {
    expect(getPostBySlug('进度条那些事')?.title).toContain('进度条')
    expect(getPostBySlug('不存在的slug')).toBeUndefined()
  })

  it('private/ 目录内容绝不进入索引', () => {
    expect(getAllPosts().map((p) => p.slug)).not.toContain('private/secret-draft')
    expect(getAllPosts().some((p) => p.title.includes('真题题解'))).toBe(false)
  })

  it('缺 front-matter 兜底：title 取文件名、date 非空', () => {
    const p = getPostBySlug('多字节字符')
    expect(p?.title).toBe('多字节字符')
    expect(p?.date.length).toBeGreaterThan(0)
  })

  it('getAllTags 聚合计数', () => {
    const tags = Object.fromEntries(getAllTags().map((t) => [t.tag, t.count]))
    expect(tags['Rust']).toBe(1)
    expect(tags['前端技术']).toBe(1)
  })

  it('getPostsByTag 精确过滤', () => {
    expect(getPostsByTag('Rust').map((p) => p.slug)).toEqual(['rust读书笔记'])
  })

  it('paginate：11 篇每页 10 → 第二页 1 篇', () => {
    expect(PAGINATION_SIZE).toBe(10)
    const make = (n: number): Post[] =>
      Array.from({ length: n }, (_, i) => ({
        slug: `p-${i}`,
        title: `t-${i}`,
        date: `2022-01-01 00:00:${String(i % 60).padStart(2, '0')}`,
        updated: '',
        tags: [],
        content: '',
      }))
    const page2 = paginate(make(11), 2)
    expect(page2.posts).toHaveLength(1)
    expect(page2.pages).toBe(2)
    expect(page2.total).toBe(11)
    expect(paginate(make(11), 3).posts).toHaveLength(1) // 页码越界勱制到末页
    expect(paginate(make(11), 3).page).toBe(2)
    expect(paginate(make(11), 0).page).toBe(1)
  })
})
