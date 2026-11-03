'use client'

import { useEffect } from 'react'

/**
 * PromptCopyEnhancer：给 SSR 渲染出的 Prompt 演示块（pre[data-prompt]）挂复制按钮。
 * SSR HTML 里无法内嵌交互按钮，水合完成后补一层 relative 包裹 + 右上角按钮。
 * 复制失败有兜底文案；包裹层带 data 标记防重复挂载（客户端重复挂载守卫）。
 */
export function PromptCopyEnhancer() {
  useEffect(() => {
    document.querySelectorAll<HTMLPreElement>('pre[data-prompt]').forEach((pre) => {
      if (pre.parentElement?.dataset.promptWrap) return
      const wrap = document.createElement('div')
      wrap.className = 'relative'
      wrap.dataset.promptWrap = ''
      pre.replaceWith(wrap)
      wrap.appendChild(pre)

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = '复制'
      btn.className = 'prompt-copy-btn'
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText((pre.textContent ?? '').trim())
          btn.textContent = '已复制 ✓'
        } catch {
          btn.textContent = '复制失败'
        }
        setTimeout(() => {
          btn.textContent = '复制'
        }, 1600)
      })
      wrap.appendChild(btn)
    })
  }, [])

  return null
}
