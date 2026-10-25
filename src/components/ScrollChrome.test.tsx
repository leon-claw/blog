/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ScrollChrome } from './ScrollChrome'

beforeEach(() => {
  document.body.innerHTML = '<header id="site-header"></header><div id="scroll-progress-holder"></div>'
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true })
  Object.defineProperty(document.documentElement, 'clientHeight', { value: 800, configurable: true })
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
})
afterEach(cleanup)

const header = () => document.getElementById('site-header')!
const progress = () => document.getElementById('scroll-progress')!

describe('ScrollChrome（进度条 + header 收缩）', () => {
  it('scrollY>70：header.is-scrolled；进度条宽度=滚动百分比', () => {
    render(<ScrollChrome />)
    act(() => {
      window.scrollY = 120
      window.dispatchEvent(new Event('scroll'))
    })
    expect(header().classList.contains('is-scrolled')).toBe(true)
    // (2000-800) 可滚动，120/1200 = 10%
    expect(progress().style.width).toBe('10%') // CSSOM 序列化掉尾零
  })

  it('回到顶部：收缩移除、进度条归零', () => {
    render(<ScrollChrome />)
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
    window.dispatchEvent(new Event('scroll'))
    expect(header().classList.contains('is-scrolled')).toBe(false)
    expect(progress().style.width).toBe('0%')
  })
})
