/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'
import { THEME_STORAGE_KEY } from '@/lib/theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
})
afterEach(cleanup)

describe('ThemeToggle', () => {
  it('点击进入暗色：html.dark-mode + localStorage.theme="dark"，再点恢复', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')
    await user.click(btn)
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    await user.click(btn)
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
})
