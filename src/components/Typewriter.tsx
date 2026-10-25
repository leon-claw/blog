'use client'

import { useEffect, useState } from 'react'
import { SITE } from '@/config/site'

/** 常量＝旧 relay-typewriter.js 等价迁移（spec §visual_effects） */
export const TYPE_SPEED_MS = 120
export const WAIT_BEFORE_TYPING_MS = 800
export const HITOKOTO_TIMEOUT_MS = 4000
export const LINE_SPLIT_TOKEN = '｜|'

const HITOKOTO_URL = 'https://v1.hitokoto.cn/?c=a&c=b&c=d&c=k'

/** 句源解析：多段文本按 LINE_SPLIT_TOKEN 切成接力行（空段剔除） */
function splitLines(parts: string[]): string[] {
  return parts
    .map((s) => s.split(LINE_SPLIT_TOKEN))
    .flat()
    .map((s) => s.trim())
    .filter(Boolean)
}

export function Typewriter({ lines = [], fallbackLine = SITE.description }: { lines?: string[]; fallbackLine?: string }) {
  const [done, setDone] = useState<string[]>([])
  const [current, setCurrent] = useState('')

  useEffect(() => {
    let cancelled = false

    // prefers-reduced-motion：跳过 fetch 与逐字特效，直接静态全文（spec §visual_effects fallback）
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false) {
      setDone(splitLines([fallbackLine]))
      return () => {
        cancelled = true
      }
    }

    const ac = new AbortController()
    const timeout = setTimeout(() => ac.abort(), HITOKOTO_TIMEOUT_MS)

    const startTyping = (targets: string[]) => {
      if (cancelled || targets.length === 0) return
      let li = 0
      let ci = 0
      setDone([])
      const step = () => {
        if (cancelled) return
        const line = targets[li] ?? ''
        if (ci < line.length) {
          ci += 1
          setCurrent(line.slice(0, ci))
          setTimeout(step, TYPE_SPEED_MS)
        } else {
          setDone((prev) => [...prev, line])
          setCurrent('')
          li += 1
          ci = 0
          if (li < targets.length) setTimeout(step, TYPE_SPEED_MS) // 接力：前一行为完毕才起下一行
        }
      }
      setTimeout(step, WAIT_BEFORE_TYPING_MS)
    }

    // 本地句源（lines 非空）：不发起网络请求
    if (lines.length > 0) {
      clearTimeout(timeout)
      ac.abort()
      startTyping(splitLines(lines))
    } else {
      fetch(HITOKOTO_URL, { signal: ac.signal })
        .then((res) => res.json())
        .then((data: { hitokoto?: string }) => {
          if (cancelled) return
          clearTimeout(timeout)
          startTyping(splitLines([data.hitokoto ?? fallbackLine]))
        })
        .catch(() => {
          if (cancelled) return
          clearTimeout(timeout)
          startTyping(splitLines([fallbackLine]))
        })
    }

    return () => {
      cancelled = true
      clearTimeout(timeout)
      ac.abort()
    }
    // 首屏一次性装配：句源/回退在页面生命周期内不变
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <p className="typewriter" aria-label={[...done, current].join('')}>
      {done.map((line, i) => (
        <span key={`${line}-${i}`} className="typewriter-line">
          {line}
          <br />
        </span>
      ))}
      {current ? <span className="typewriter-current">{current}</span> : null}
    </p>
  )
}
