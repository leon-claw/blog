import Link from 'next/link'
import { SITE } from '@/config/site'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { href: '/', label: '首页' },
  { href: '/archives', label: '归档' },
  { href: '/tags', label: '标签' },
  { href: '/about', label: '关于' },
]

/** 固定头部（server）：滚动行为由 ScrollChrome 驱动 .is-scrolled，收缩/毛玻璃在 globals.css */
export function Header() {
  return (
    <header
      id="site-header"
      className="fixed inset-x-0 top-0 z-40 border-b border-border-soft bg-bg/95 transition-[height,backdrop-filter] duration-200 ease-standard"
    >
      <div className="mx-auto flex h-full w-full max-w-[var(--content-max)] items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold text-text-strong transition-colors duration-200 ease-standard hover:text-primary">
          {SITE.title}
        </Link>
        <nav className="flex items-center gap-5" aria-label="主导航">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-text-dim transition-colors duration-200 ease-standard hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
