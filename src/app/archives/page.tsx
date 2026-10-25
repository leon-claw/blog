import { groupByYear } from '@/lib/group'
import { getAllPosts } from '@/lib/posts'
import { postHref } from '@/components/PostCard'

export const metadata = { title: '归档' }

export default function ArchivesPage() {
  const groups = groupByYear(getAllPosts())
  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4">
      <h1 className="text-2xl font-semibold text-text-strong">归档</h1>
      {groups.map(({ year, posts }) => (
        <section key={year} className="mt-6">
          <h2 className="text-lg font-semibold text-text-strong">
            {year} <span className="text-xs font-normal text-text-dim">({posts.length})</span>
          </h2>
          <ul className="mt-2">
            {posts.map((p) => (
              <li key={p.slug} className="flex items-baseline gap-4 border-b border-border-soft py-2 text-sm">
                <time dateTime={p.date} className="shrink-0 text-xs text-text-faint">
                  {p.date.slice(5, 10)}
                </time>
                <a href={postHref(p.slug)} className="transition-colors duration-200 ease-standard hover:text-primary">
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
