import Link from 'next/link'
import { getAllTags } from '@/lib/posts'

export const metadata = { title: '标签' }

export default function TagsPage() {
  const tags = getAllTags()
  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4">
      <h1 className="text-2xl font-semibold text-text-strong">标签</h1>
      <p className="mt-4 flex flex-wrap gap-3">
        {tags.map(({ tag, count }) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className="rounded-full bg-bg-sunken px-3 py-1 text-sm text-text-dim transition-colors duration-200 ease-standard hover:bg-primary hover:text-white"
          >
            {tag} <span className="text-xs opacity-70">{count}</span>
          </Link>
        ))}
      </p>
    </div>
  )
}
