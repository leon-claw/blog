import Link from 'next/link'
import type { Post } from '@/lib/posts'
import { TagPill } from './TagPill'

/** 站内文章链接：传原始中文 slug（Next 会统一 percent-encode；预编码会被再次编码成双重转义） */
export function postHref(slug: string): string {
  return `/posts/${slug}`
}

export function PostCard({ post }: { post: Post }) {
  const showUpdated = post.updated && post.updated !== post.date
  return (
    <article className="border-b border-border-soft py-5 transition-colors duration-200 ease-standard">
      <h2 className="text-xl font-semibold text-text-strong">
        <Link
          href={postHref(post.slug)}
          className="transition-colors duration-200 ease-standard hover:text-primary"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-2 text-xs text-text-dim">
        <time dateTime={post.date}>{post.date.slice(0, 10)}</time>
        {showUpdated ? <span className="ml-3">更新于 {post.updated.slice(0, 10)}</span> : null}
      </p>
      {post.tags.length > 0 ? (
        <p className="mt-2 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <TagPill key={t} tag={t} />
          ))}
        </p>
      ) : null}
    </article>
  )
}
