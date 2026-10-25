/** @vitest-environment jsdom */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import RootLayout from '@/app/layout'

afterEach(cleanup)

describe('RootLayout（主题 pre-hydration 内联脚本）', () => {
  it('body 首插 theme 内联 script（先于内容渲染，防闪烁）', () => {
    const { container } = render(
      <RootLayout>
        <main>content-marker</main>
      </RootLayout>,
    )
    const html = container.innerHTML
    const scriptIdx = html.indexOf('localStorage.getItem("theme")')
    expect(scriptIdx).toBeGreaterThan(-1)
    expect(scriptIdx).toBeLessThan(html.indexOf('content-marker'))
    expect(scriptIdx).toBeLessThan(html.indexOf('site-header'))
  })
})
