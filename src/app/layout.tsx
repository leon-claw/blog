import type { Metadata } from 'next'
import { SITE } from '@/config/site'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import { Header } from '@/components/Header'
import { ScrollChrome } from '@/components/ScrollChrome'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: { default: SITE.title, template: `%s - ${SITE.title}` },
  description: SITE.description,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-bg pt-[var(--header-height)] text-text-base font-sans text-blog antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ScrollChrome />
        <Header />
        {children}
      </body>
    </html>
  )
}
