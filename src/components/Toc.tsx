'use client'

import { useEffect, useState } from 'react'
import type { Heading } from '@/lib/markdown'

/** 桌面端目录（≥1024px 右侧）：纯展示 + IntersectionObserver 高亮当前小节（本页唯一 client 交互） */
export function Toc({ toc }: { toc: Heading[] }) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (toc.length === 0) return
    const els = toc.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => Boolean(el))
    if (els.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-70px 0px -70% 0px', threshold: 0 },
    )
    for (const el of els) observer.observe(el)
    return () => observer.disconnect()
  }, [toc])

  if (toc.length === 0) return null
  return (
    <ul className="space-y-2 border-l-2 border-border-soft text-xs">
      {toc.map((h) => (
        <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
          <a
            href={`#${h.id}`}
            className={`transition-colors duration-200 ease-standard hover:text-primary ${
              active === h.id ? 'text-primary' : 'text-text-dim'
            }`}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  )
}
