import { notFound } from 'next/navigation'
import { decodeParamSlug, excerpt, postStaticParams } from '@/lib/post-page'
import { getAdjacentPosts, getPostBySlug } from '@/lib/posts'
import { readingMetrics, renderMarkdown } from '@/lib/markdown'
import { Prose } from '@/components/Prose'
import { TagPill } from '@/components/TagPill'
import { Toc } from '@/components/Toc'
import { postHref } from '@/components/PostCard'

// SSG 全量预渲染；动态参数未预渲染时按需渲染兜底（不用 false——
// 框架对非 ASCII slug 的 prerender 键匹配有缺陷，false 会把中文 slug 一律 404/NoFallbackError）。
export const dynamicParams = true

export function generateStaticParams() {
  return postStaticParams()
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPostBySlug(decodeParamSlug((await params).slug))
  if (!post) return {}
  return { title: post.title, description: excerpt(post.content) }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeParamSlug((await params).slug)
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const { html, toc } = await renderMarkdown(post.content)
  const { chars, minutes } = readingMetrics(post.content)
  const { prev, next } = getAdjacentPosts(slug)
  const showUpdated = post.updated && post.updated !== post.date

  return (
    <div className="mx-auto grid w-full max-w-[var(--content-max)] grid-cols-1 gap-10 px-4 xl:grid-cols-[minmax(0,1fr)_240px]">
      <article>
        <header>
          <h1 className="text-3xl font-semibold text-text-strong">{post.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-dim">
            <time dateTime={post.date}>发布于 {post.date.slice(0, 10)}</time>
            {showUpdated ? <time dateTime={post.updated}>更新于 {post.updated.slice(0, 10)}</time> : null}
            <span>
              {chars} 字 · 约 {minutes} 分钟
            </span>
          </p>
          {post.tags.length > 0 ? (
            <p className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <TagPill key={t} tag={t} />
              ))}
            </p>
          ) : null}
        </header>

        <Prose html={html} />

        <nav className="mt-10 flex flex-col gap-2 border-t border-border-soft pt-6 text-sm sm:flex-row sm:justify-between" aria-label="相邻文章">
          {prev ? (
            <a href={postHref(prev.slug)} className="group max-w-[48%] transition-colors duration-200 ease-standard hover:text-primary">
              <span className="block text-xs text-text-faint">← 上一篇</span>
              <span className="text-text-strong group-hover:text-primary">{prev.title}</span>
            </a>
          ) : (
            <span className="max-w-[48%]" />
          )}
          {next ? (
            <a href={postHref(next.slug)} className="group max-w-[48%] text-right transition-colors duration-200 ease-standard hover:text-primary">
              <span className="block text-xs text-text-faint">下一篇 →</span>
              <span className="text-text-strong group-hover:text-primary">{next.title}</span>
            </a>
          ) : null}
        </nav>
      </article>

      <aside className="hidden xl:block">
        <nav className="sticky top-24" aria-label="目录">
          <Toc toc={toc} />
        </nav>
      </aside>
    </div>
  )
}
