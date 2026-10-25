import fs from 'node:fs'
import path from 'node:path'
import { renderMarkdown, readingMetrics } from '@/lib/markdown'
import { Prose } from '@/components/Prose'

export const metadata = { title: '关于' }

const ABOUT_FILE = () => process.env.ABOUT_SRC ?? path.resolve(process.cwd(), 'content/pages/about.md')

/** about 为站点级单页：与其他页一致走构建期渲染 */
export default async function AboutPage() {
  const md = fs.readFileSync(ABOUT_FILE(), 'utf8')
  const { html } = await renderMarkdown(md)
  const { chars, minutes } = readingMetrics(md)
  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4">
      <Prose html={html} />
      <p className="mt-8 text-xs text-text-dim">
        {chars} 字 · 约 {minutes} 分钟
      </p>
    </div>
  )
}
