import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { normalizeObsidianImages, readingMetrics, renderMarkdown } from './markdown'

const fx = (name: string) => fs.readFileSync(path.resolve(__dirname, `../../tests/fixtures/markdown/${name}`), 'utf8')

describe('renderMarkdown', () => {
  it('代码块带 data-language 且双主题 CSS 变量齐备', async () => {
    const { html } = await renderMarkdown(fx('dual-theme.md'))
    expect(html).toMatch(/<pre[^>]*data-language="ts"/)
    expect(html).toContain('--shiki-light')
    expect(html).toContain('--shiki-dark')
  })

  it('TOC 只收 h2/h3，共 3 项，id 与正文 anchor 一致', async () => {
    const { html, toc } = await renderMarkdown(fx('toc.md'))
    expect(toc.map((h) => h.level)).toEqual([2, 3, 2])
    expect(toc.every((h) => h.id && h.text)).toBe(true)
    for (const h of toc) expect(html).toContain(`id="${h.id}"`)
    expect(toc.some((h) => h.level === 1)).toBe(false)
  })
})

describe('readingMetrics（spec：去代码块与图片；400 字/分钟下限 1）', () => {
  it('chars 不计 fenced code 内容', () => {
    const md = '这是正文第一句。\n\n```ts\nconst veryLongCodeLine = "不应被计入字符数"\n```\n\n结尾一句。'
    expect(readingMetrics(md).chars).toBe('这是正文第一句。'.length + '结尾一句。'.length)
  })

  it('短文中 minutes 下限为 1', () => {
    const m = readingMetrics(fx('zh-dense.md'))
    expect(m.minutes).toBe(1)
    expect(m.chars).toBeGreaterThan(0)
  })

  it('图片语法不计入', () => {
    const m = readingMetrics('![[./images/a.png]] 好')
    expect(m.chars).toBe('好'.length)
  })
})

describe('normalizeObsidianImages（文章源直读后，wiki 图片语法在渲染层转换）', () => {
  it('带 images/ 前缀与 ./ 相对路径都归一到 /images/articles/', () => {
    expect(normalizeObsidianImages('![[./images/xx.png]]')).toBe(
      '<img src="/images/articles/xx.png" alt="xx.png">',
    )
    expect(normalizeObsidianImages('![[Pasted image 2021.png]]')).toBe(
      '<img src="/images/articles/Pasted%20image%202021.png" alt="Pasted image 2021.png">',
    )
  })

  it('宽度后缀并入 width 属性；非数字后缀不吞掉内容', () => {
    expect(normalizeObsidianImages('![[a.png|500]]')).toBe(
      '<img src="/images/articles/a.png" alt="a.png" width="500">',
    )
    expect(normalizeObsidianImages('正文 ![[a.png|bar]] 仍转')).toBe(
      '正文 <img src="/images/articles/a.png" alt="a.png"> 仍转',
    )
  })

  it('中文文件名 encodeURI 保留可读性；属性转义引号', () => {
    expect(normalizeObsidianImages('![[測試.png]]')).toBe(
      '<img src="/images/articles/%E6%B8%AC%E8%A9%A6.png" alt="測試.png">',
    )
    expect(normalizeObsidianImages('![[a"b.png]]')).toBe(
      '<img src="/images/articles/a%22b.png" alt="a&quot;b.png">',
    )
  })

  it('renderMarkdown 全链路：wiki 图渲染进 html', async () => {
    const { html } = await renderMarkdown('段落 ![[./images/全链路.png]]')
    expect(html).toContain('src="/images/articles/%E5%85%A8%E9%93%BE%E8%B7%AF.png"')
  })
})
