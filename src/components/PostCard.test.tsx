/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PostCard } from './PostCard'
import { Pagination } from './Pagination'
import type { Post } from '@/lib/posts'

afterEach(cleanup)

const base: Post = {
  slug: '进度条那些事',
  title: 'Svg 画进度条延伸出来的知识点',
  date: '2022-03-22 08:30:00',
  updated: '2022-03-22 08:30:00',
  tags: ['前端技术', 'SVG'],
  content: '',
}

describe('PostCard', () => {
  it('渲染 h2 标题、日期与 tag pill，链接指向 /posts/:slug', () => {
    render(<PostCard post={base} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Svg 画进度条延伸出来的知识点' })).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Svg 画进度条延伸出来的知识点' })
    // href attr 原样保留中文（合法 IRI；请求时浏览器/服务端负责 percent-encode，路由侧取回解码 slug）
    expect(link.getAttribute('href')).toBe('/posts/进度条那些事')
    expect(screen.getByText('2022-03-22')).toBeTruthy()
    expect(screen.getByRole('link', { name: '前端技术' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'SVG' })).toBeTruthy()
  })

  it('updated 与 date 相同则不显示更新时间', () => {
    render(<PostCard post={base} />)
    expect(screen.queryByText(/更新于/)).toBeNull()
  })

  it('updated 晚于 date 时显示更新时间', () => {
    render(<PostCard post={{ ...base, updated: '2023-01-02 10:00:00' }} />)
    expect(screen.getByText(/更新于 2023-01-02/)).toBeTruthy()
  })
})

describe('Pagination', () => {
  it('pages>1：当前页非链接、其余页码为链接（第 1 页→/、第 3 页→/page/3）', () => {
    render(<Pagination page={2} pages={3} total={30} />)
    const first = screen.getByRole('link', { name: '1' })
    expect(first.getAttribute('href')).toBe('/')
    const third = screen.getByRole('link', { name: '3' })
    expect(third.getAttribute('href')).toBe('/page/3')
    expect(screen.getAllByText('2')).toHaveLength(1) // 当前页是 <span> 非链接
    expect(screen.getByText('共 30 篇 · 2 / 3 页')).toBeTruthy()
    expect(screen.getByRole('link', { name: /下一页/ }).getAttribute('href')).toBe('/page/3')
    expect(screen.getByRole('link', { name: /上一页/ }).getAttribute('href')).toBe('/')
  })

  it('pages===1：渲染 null', () => {
    const { container } = render(<Pagination page={1} pages={1} total={5} />)
    expect(container).toBeEmptyDOMElement()
  })
})
