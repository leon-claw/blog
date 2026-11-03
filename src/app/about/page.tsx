import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { renderMarkdown } from '@/lib/markdown'
import { Prose } from '@/components/Prose'

export const metadata = { title: '关于' }

const ABOUT_FILE = () => process.env.ABOUT_SRC ?? path.resolve(process.cwd(), 'content/pages/about.md')

/**
 * about 为站点级单页，与其他页一致走构建期渲染。
 * 页面结构对齐参考站（jamesalaniz.dev/about）：frontmatter 供标题，
 * 正文只渲染内容本身（三段开场 + h2 分节），不叠加文章页的日期/字数等头部信息。
 */
export default async function AboutPage() {
  const raw = fs.readFileSync(ABOUT_FILE(), 'utf8')
  const { data, content } = matter(raw)
  const { html } = await renderMarkdown(content)
  const title = typeof data.title === 'string' && data.title ? data.title : '关于'

  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4">
      <h1 className="text-3xl font-semibold text-text-strong">{title}</h1>
      <Prose html={html} />
    </div>
  )
}
