import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { readingMetrics, renderMarkdown } from './markdown'

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
