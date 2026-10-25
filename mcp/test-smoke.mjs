#!/usr/bin/env node
/**
 * MCP server 冒烟测试：以 stdio 子进程方式启动 server.mjs，
 * 按 MCP 协议发送 initialize / tools/list / tools/call / resources 请求并断言。
 * 用法：node mcp/test-smoke.mjs
 */
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER = join(dirname(fileURLToPath(import.meta.url)), 'server.mjs')
const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] })

let buffer = ''
const pending = new Map()
let nextId = 1

child.stdout.setEncoding('utf8')
child.stdout.on('data', (chunk) => {
  buffer += chunk
  let idx
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
      }
    } catch (e) {
      console.error('无法解析输出行:', line.slice(0, 200))
    }
  }
})

child.stderr.setEncoding('utf8')
let stderrLog = ''
child.stderr.on('data', (c) => (stderrLog += c))

function rpc(method, params) {
  const id = nextId++
  const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params })
  return new Promise((resolve, reject) => {
    pending.set(id, (response) => {
      if (response.error) reject(new Error(JSON.stringify(response.error)))
      else resolve(response.result)
    })
    child.stdin.write(msg + '\n')
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`请求超时: ${method}`))
      }
    }, 10_000)
  })
}

const results = []
function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? '✔' : '✘'} ${name}${ok ? '' : ' —— ' + extra}`)
}

try {
  // 1. initialize
  const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0.0.0' },
  })
  check('initialize 握手', !!init.serverInfo?.name, JSON.stringify(init).slice(0, 200))
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')

  // 2. tools/list
  const tools = await rpc('tools/list', {})
  const names = tools.tools.map((t) => t.name)
  check(
    'tools/list 包含全部 5 个工具',
    ['search_posts', 'list_posts', 'get_post', 'list_tags', 'get_site_info'].every((n) => names.includes(n)),
    names.join(','),
  )

  // 3. search_posts 中文检索
  const search = await rpc('tools/call', {
    name: 'search_posts',
    arguments: { query: 'react 性能', limit: 5 },
  })
  const searchResults = JSON.parse(search.content[0].text)
  check(
    'search_posts("react 性能") 有结果',
    searchResults.results.length > 0,
    JSON.stringify(searchResults.results.slice(0, 2)),
  )

  // 4. list_posts
  const list = await rpc('tools/call', { name: 'list_posts', arguments: { limit: 5 } })
  const listData = JSON.parse(list.content[0].text)
  check(
    'list_posts 返回 total 与分页',
    listData.total > 50 && listData.posts.length === 5 && listData.posts[0].url?.length > 0,
    `total=${listData.total}, first=${listData.posts[0]?.title}`,
  )

  // 5. get_post（slug）
  const post = await rpc('tools/call', { name: 'get_post', arguments: { slug: 'git' } })
  const postText = post.content?.map((c) => c.text).join('')
  check('get_post("git") 返回完整 Markdown', postText.includes('# git') || postText.length > 500, `len=${postText.length}`)

  // 6. get_post（中文标题）
  const post2 = await rpc('tools/call', { name: 'get_post', arguments: { slug: 'Next.js可行性调研' } })
  const post2Text = post2.content?.map((c) => c.text).join('')
  check(
    'get_post 支持中文标题',
    post2Text?.includes('Next.js可行性调研') && post2Text.length > 500,
    (post2.isError ? JSON.stringify(post2.content) : '').slice(0, 200),
  )

  // 7. list_tags
  const tags = await rpc('tools/call', { name: 'list_tags', arguments: {} })
  const tagsData = JSON.parse(tags.content[0].text)
  check('list_tags 有数据', tagsData.tags.length > 10, `tags=${tagsData.tags.length}`)

  // 8. get_site_info
  const info = await rpc('tools/call', { name: 'get_site_info', arguments: {} })
  const infoData = JSON.parse(info.content[0].text)
  check(
    'get_site_info 站点信息',
    infoData.name?.length > 0 && infoData.postCount > 50,
    `${infoData.name}, ${infoData.postCount} posts`,
  )

  // 9. resources/list
  const resources = await rpc('resources/list', {})
  check('resources/list 列出站点与文章资源', resources.resources.length > 50, `${resources.resources.length} resources`)

  // 10. resources/read
  const resource = await rpc('resources/read', { uri: 'blog://posts/git' })
  check('resources/read 读取文章 Markdown', resource.contents[0].text.length > 500, `len=${resource.contents[0].text.length}`)

  // 11. 私密内容不应被检索到（private 目录里的 "110题真题题解" 不存在于公开文章）
  const secret = await rpc('tools/call', { name: 'search_posts', arguments: { query: '真题题解' } })
  const secretData = JSON.parse(secret.content[0].text)
  check(
    '私密目录内容不可检索',
    !secretData.results.some((r) => r.slug.includes('真题') || r.title.includes('真题')),
    JSON.stringify(secretData.results.map((r) => r.title)),
  )
} catch (err) {
  check('协议交互', false, err.message)
} finally {
  child.kill('SIGTERM')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (stderrLog && failed.length) console.log('--- server stderr ---\n' + stderrLog)
process.exit(failed.length ? 1 : 0)
