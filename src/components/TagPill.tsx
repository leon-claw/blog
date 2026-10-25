import Link from 'next/link'

export function TagPill({ tag }: { tag: string }) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className="inline-block rounded-full bg-bg-sunken px-2.5 py-0.5 text-xs text-text-dim transition-colors duration-200 ease-standard hover:bg-primary hover:text-white"
    >
      {tag}
    </Link>
  )
}
