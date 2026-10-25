import '@testing-library/jest-dom/vitest'

/**
 * jsdom@30 未暴露 localStorage（window.localStorage === undefined）。
 * 测试环境兜底：Map 实现同形 API（getItem/setItem/removeItem/clear/key/length），
 * 生产代码不受影响——部署环境是真实浏览器。
 */
if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const polyfill = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(String(k), String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(window, 'localStorage', { value: polyfill, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: polyfill, configurable: true, writable: true })
}

// matchMedia 同理（jsdom 不提供）；默认不 reduce，个别测试自行覆写
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    configurable: true,
    writable: true,
  })
}
