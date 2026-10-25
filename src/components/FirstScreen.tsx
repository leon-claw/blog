'use client'

import { SITE } from '@/config/site'
import { Typewriter } from './Typewriter'

/**
 * 首屏（Liquid 全屏 cover）：背景 SVG（亮/暗两版，class 切换）+ 站名 + 打字机。
 * 句源走 hitokoto（4s 超时），回退 SITE.description —— 与旧 relay-typewriter 行为等价。
 */
export function FirstScreen() {
  return (
    <section className="first-screen flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-4xl font-semibold text-text-strong">{SITE.title}</h1>
      <Typewriter lines={[]} fallbackLine={SITE.description} />
    </section>
  )
}
