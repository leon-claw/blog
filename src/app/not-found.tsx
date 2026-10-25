import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[var(--content-max)] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-6xl font-semibold text-text-faint">404</p>
      <p className="mt-4 text-text-dim">页面不存在，或已随风而去。</p>
      <Link
        href="/"
        className="mt-6 rounded-[var(--radius-box)] bg-primary px-4 py-2 text-sm text-white transition-colors duration-200 ease-standard hover:bg-primary-hover"
      >
        回到首页
      </Link>
    </div>
  )
}
