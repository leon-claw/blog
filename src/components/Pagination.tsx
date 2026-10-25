import Link from 'next/link'

export function Pagination({ page, pages, total }: { page: number; pages: number; total: number }) {
  if (pages <= 1) return null
  const hrefFor = (n: number) => (n <= 1 ? '/' : `/page/${n}`)
  return (
    <nav className="flex items-center justify-between py-6 text-sm text-text-dim" aria-label="分页">
      <span>
        共 {total} 篇 · {page} / {pages} 页
      </span>
      <span className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="px-2 py-1 transition-colors duration-200 ease-standard hover:text-primary">
            上一页
          </Link>
        ) : null}
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
          n === page ? (
            <span key={n} aria-current="page" className="px-2 py-1 font-semibold text-primary">
              {n}
            </span>
          ) : (
            <Link
              key={n}
              href={hrefFor(n)}
              className="px-2 py-1 transition-colors duration-200 ease-standard hover:text-primary"
            >
              {n}
            </Link>
          ),
        )}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className="px-2 py-1 transition-colors duration-200 ease-standard hover:text-primary">
            下一页
          </Link>
        ) : null}
      </span>
    </nav>
  )
}
