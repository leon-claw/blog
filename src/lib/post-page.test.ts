import { beforeAll, describe, expect, it } from 'vitest'
import path from 'node:path'
import { excerpt, postStaticParams } from './post-page'
import { getAdjacentPosts } from './posts'

const FIXTURES = path.resolve(__dirname, '../../tests/fixtures/content/posts')

describe('postStaticParams（SSG 参数清单）', () => {
  beforeAll(() => {
    process.env.POSTS_SRC = FIXTURES
  })

  it('包含中文 slug「进度条那些事」的 encoded 形态，全量唯一', () => {
    const params = postStaticParams()
    const slugs = params.map((p) => p.slug)
    expect(slugs).toContain(encodeURIComponent('进度条那些事'))
    expect(new Set(slugs).size).toBe(slugs.length)
    // 键为 percent-encoded 形态（与请求 URL 同形态；防框架非 ASCII 键位不一致
    for (const s of slugs) expect(decodeURIComponent(s)).not.toMatch(/%[0-9a-f]{2}/i)
  })
})

/*
 * getAdjacentPosts 链表语义（posts 已按 date 降序）：prev=更早发布，next=更新发布。
 * fixture 时序：多字节字符（mtime=now，最新）> rust读书笔记（2022-05）> 进度条那些事（2022-03-22，最早）
 */
describe('getAdjacentPosts', () => {
  beforeAll(() => {
    process.env.POSTS_SRC = FIXTURES
  })

  it('最早一篇：prev=undefined、next=次新', () => {
    const { prev, next } = getAdjacentPosts('进度条那些事')
    expect(prev).toBeUndefined()
    expect(next?.slug).toBe('rust读书笔记')
  })

  it('最新一篇：next=undefined、prev=次旧', () => {
    const { prev, next } = getAdjacentPosts('多字节字符')
    expect(next).toBeUndefined()
    expect(prev?.slug).toBe('rust读书笔记')
  })

  it('中间一篇：prev/next 齐备', () => {
    const { prev, next } = getAdjacentPosts('rust读书笔记')
    expect(next?.slug).toBe('多字节字符')
    expect(prev?.slug).toBe('进度条那些事')
  })

  it('未知 slug：双 undefined', () => {
    expect(getAdjacentPosts('不存在')).toEqual({ prev: undefined, next: undefined })
  })
})

describe('excerpt（generateMetadata 的 description）', () => {
  it('截取正文纯文本前 120 字，代码块剔除', () => {
    const md = '开头引言在这里。\n\n```ts\nconst a = 1\n```\n\n' + '展'.repeat(200)
    const e = excerpt(md)
    expect(e.startsWith('开头引言在这里。')).toBe(true)
    expect(e).not.toContain('const a = 1')
    expect(e.length).toBeLessThanOrEqual(121) // 120 内容 + 省略号
  })
})
