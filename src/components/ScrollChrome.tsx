'use client'

import { useEffect, useState } from 'react'

/** HEADER_SCROLL_THRESHOLD 与 --header-height:70px（globals.css token）保持同值；DNA 收缩后 50px 由 .is-scrolled 接管 */
const HEADER_SCROLL_THRESHOLD = 70

/** 滚动三件套（合并为单 client 组件）：进度条宽度 + header .is-scrolled（CSS 负责 70→50px 收缩 + 4px 毛玻璃） */
export function ScrollChrome() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const scrolled = window.scrollY
      const header = document.getElementById('site-header')
      header?.classList.toggle('is-scrolled', scrolled > HEADER_SCROLL_THRESHOLD)
      const total = doc.scrollHeight - doc.clientHeight
      setProgress(total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      id="scroll-progress"
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-[2px] bg-primary transition-none"
      style={{ width: `${(progress * 100).toFixed(1)}%` }}
    />
  )
}
