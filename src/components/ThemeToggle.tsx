'use client'

import { useCallback, useState } from 'react'
import { THEME_STORAGE_KEY } from '@/lib/theme'

/** 全局明暗切换：改 <html> class + 显式写 localStorage（未存时跟随系统） */
export function ThemeToggle() {
  const initial = () =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark-mode')
  const [dark, setDark] = useState(initial)

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark-mode')
    document.documentElement.classList.toggle('dark-mode', next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      /* 隐私模式等 localStorage 不可写：仅本次会话生效 */
    }
    setDark(next)
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? '切换到亮色模式' : '切换到暗色模式'}
      className="rounded-full p-2 text-text-dim transition-colors duration-200 ease-standard hover:text-primary"
    >
      {dark ? '🌙' : '☀️'}
    </button>
  )
}
