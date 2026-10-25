/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TryIt, BODY_DISPLAY_LIMIT } from './TryIt'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const mockJson = (body: string, headers: Record<string, string> = {}, status = 200) => {
  vi.mocked(fetch).mockResolvedValue({
    status,
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    text: async () => body,
  } as unknown as Response)
}

describe('TryIt（点击即发的接口演示块）', () => {
  it('渲染 label/URL，点击后展示 status + 关键响应头 + body', async () => {
    const user = userEvent.setup()
    mockJson('{"hello":"world"}', { 'retry-after': '60' })
    render(<TryIt label="回显" method="GET" url="/api/echo" note="演示说明" />)
    expect(screen.getByText('回显')).toBeTruthy()
    expect(screen.getByText('/api/echo')).toBeTruthy()
    expect(screen.getByText('演示说明')).toBeTruthy()
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '发送请求' }))
    })
    expect(screen.getByText(/^200（/)).toBeTruthy()
    expect(screen.getByText(/retry-after: 60/)).toBeTruthy()
    expect(screen.getByText(/"hello":"world"/)).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith('/api/echo', { method: 'GET' })
  })

  it('请求失败：渲染错误行（含 fetch: network down）', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockRejectedValue(new Error('fetch: network down'))
    render(<TryIt label="延迟" method="GET" url="/api/delay/1" />)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '发送请求' }))
    })
    expect(screen.getByText(/fetch: network down/)).toBeTruthy()
  })

  it('body 截断：3010 字仅显示前 2048 + 截断标记', async () => {
    const user = userEvent.setup()
    mockJson('x'.repeat(3010))
    render(<TryIt label="长文" method="GET" url="/api/cache" />)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '发送请求' }))
    })
    const shown = screen.getByTestId('tryit-body').textContent ?? ''
    expect(BODY_DISPLAY_LIMIT).toBe(2048)
    expect(shown).toContain('…截断')
    expect(shown.startsWith('x'.repeat(2048))).toBe(true)
    expect(shown.length).toBeLessThan(3010)
  })
})
