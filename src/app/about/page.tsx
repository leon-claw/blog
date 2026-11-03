import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { renderMarkdown } from '@/lib/markdown'
import { Prose } from '@/components/Prose'
import { PromptCopyEnhancer } from '@/components/PromptCopyEnhancer'

export const metadata = { title: '关于' }

const ABOUT_FILE = () => process.env.ABOUT_SRC ?? path.resolve(process.cwd(), 'content/pages/about.md')

/** ```text 围栏 → Prompt 演示块（data-prompt）：常暗终端观感 + PROMPT 标签 + 复制按钮（按钮由 PromptCopyEnhancer 水合后挂载） */
const markPromptBlocks = (html: string) => html.replace(/<pre(?=[^>]*data-language="text")/g, '<pre data-prompt')

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
      <Prose html={markPromptBlocks(html)} />
      <PromptCopyEnhancer />
    </div>
  )
}
