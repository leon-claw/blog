/**
 * 用 jsdom + 内置静态服务器加载 public/index.html，真实执行页面脚本，
 * 观察首屏打字机运行时行为（不依赖外部 hexo server）。
 * 用法: node bin/test-first-screen.mjs [观察毫秒=8000]
 */
import { JSDOM } from 'jsdom'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const PUBLIC = join(root, 'public')
const observeMs = Number(process.argv[2] || 8000)

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
}

const server = createServer(async (req, res) => {
  try {
    const path = normalize(new URL(req.url, 'http://x').pathname)
    const file = join(PUBLIC, path.endsWith('/') ? path + 'index.html' : path)
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const html = await readFile(join(PUBLIC, 'index.html'), 'utf8')
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  url: `http://127.0.0.1:${port}/`,
  beforeParse(window) {
    window.fetch = (url, opt) => fetch(url, opt) // 补齐 jsdom 缺失的 fetch
    window.addEventListener('error', (e) => console.log('[window.onerror]', e.message))
  },
})

const t0 = Date.now()
const log = (...a) => console.log(((Date.now() - t0) + 'ms').padStart(7), ...a)
dom.window.addEventListener('DOMContentLoaded', () => log('DOMContentLoaded'))

const deadline = Date.now() + observeMs
let lastText = null
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 300))
  const desc = dom.window.document?.querySelector('.first-screen-content .desc')
  const text = (desc?.textContent || '').slice(0, 26)
  if (text !== lastText) {
    lastText = text
    log('desc:', JSON.stringify(text))
  }
}
process.exit(0)
