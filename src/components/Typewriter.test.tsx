/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HITOKOTO_TIMEOUT_MS,
  TYPE_SPEED_MS,
  WAIT_BEFORE_TYPING_MS,
  Typewriter,
} from './Typewriter'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const advanceAll = async () => {
  // 足够长：等待期 + 打字期 + 行间断拓展
  await act(async () => {
    await vi.advanceTimersByTimeAsync(WAIT_BEFORE_TYPING_MS + 10 * TYPE_SPEED_MS + 3000)
  })
}

describe('Typewriter（首屏签名组件）', () => {
  it('fetch 成功：打出 hitokoto 文案', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => ({ hitokoto: '一禾一花' }) } as Response)
    render(<Typewriter lines={[]} fallbackLine="回退句" />)
    await advanceAll()
    expect(screen.getByText('一禾一花')).toBeTruthy()
    expect(screen.queryByText('回退句')).toBeNull()
  })

  it('fetch 失败：回退 SITE.description 文案且完整显示', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    render(<Typewriter lines={[]} fallbackLine="回退句全文" />)
    await advanceAll()
    expect(screen.getByText('回退句全文')).toBeTruthy()
  })

  it('逐字增长：先呈现前缀，后才完整', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'))
    render(<Typewriter lines={[]} fallbackLine="abcdef" />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAIT_BEFORE_TYPING_MS + 1 * TYPE_SPEED_MS)
    })
    expect(screen.getByText('ab')).toBeTruthy() // tick1@800:'a' tick2@920:'ab'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * TYPE_SPEED_MS)
    })
    expect(screen.getByText('abcdef')).toBeTruthy()
  })

  it('多行 LINE_SPLIT_TOKEN：两行接力，前一行完成才起下一行', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'))
    render(<Typewriter lines={['第一行｜|第二行']} fallbackLine="回退" />)
    // 第一 tick（恰在 WAIT 处）：仅第一行首位，第二行尚未出现
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAIT_BEFORE_TYPING_MS)
    })
    expect(screen.getByText('第')).toBeTruthy()
    expect(screen.queryByText('第二行')).toBeNull()
    await advanceAll()
    expect(screen.getByText('第一行')).toBeTruthy()
    expect(screen.getByText('第二行')).toBeTruthy()
  })

  it('fetch 挂起超 4s：超时回退', async () => {
    vi.mocked(fetch).mockImplementation((_url, init) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    render(<Typewriter lines={[]} fallbackLine="超时回退句" />)
    expect(HITOKOTO_TIMEOUT_MS).toBe(4000)
    // 4s 超时后起拍：abort@4000 → 等待期 800 → 5 字 × 120ms ≈ 6400ms 内打完
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000)
    })
    expect(screen.getByText('超时回退句')).toBeTruthy()
  })

  it('prefers-reduced-motion：直接静态全文、不 fetch、不逐字', async () => {
    const original = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: () => {} }) as unknown as typeof window.matchMedia
    const fetchMock = vi.mocked(fetch)
    render(<Typewriter lines={['任意']} fallbackLine="静态回退文本" />)
    expect(screen.getByText('静态回退文本')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    await advanceAll()
    expect(screen.getByText('静态回退文本')).toBeTruthy()
    window.matchMedia = original // 还原，避免污染后续 case
  })
})
