#!/usr/bin/env node
/**
 * 一键把 Leon's Blog 的 MCP server 注册进常见 AI Agent 客户端。
 *
 * 用法：
 *   node bin/mcp-install.mjs                     # 预览将要写入的配置（dry-run，默认）
 *   node bin/mcp-install.mjs --yes               # 实际写入（原文件自动备份为 *.bak-mcp）
 *   node bin/mcp-install.mjs --yes --only cursor # 只处理指定目标，可选值见 TARGETS
 *   node bin/mcp-install.mjs --remove --yes      # 从各客户端移除本服务
 *
 * 支持的客户端：
 *   claude-desktop  Claude 桌面版（claude_desktop_config.json）
 *   cursor          Cursor（~/.cursor/mcp.json）
 *   vscode          VS Code 项目级配置（本仓库 .vscode/mcp.json）
 *   claude-code     Claude Code CLI（claude mcp add -s user）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const BLOG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SERVER_ENTRY = join(BLOG_ROOT, 'mcp', 'server.mjs')
const SERVER_NAME = 'leon-blog'
const NODE_BIN = process.execPath // 用当前 node 的绝对路径，GUI 客户端无 shell PATH 也能启动

// ---------- CLI ----------
const argv = process.argv.slice(2)
const yes = argv.includes('--yes')
const remove = argv.includes('--remove')
const onlyIdx = argv.indexOf('--only')
const only = onlyIdx !== -1 ? argv[onlyIdx + 1]?.split(',') : null

// ---------- 目标定义 ----------

function claudeDesktopConfigPath() {
  const home = homedir()
  switch (process.platform) {
    case 'darwin': return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    case 'win32': return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
    default: return join(home, '.config', 'Claude', 'claude_desktop_config.json')
  }
}

const TARGETS = [
  {
    name: 'claude-desktop',
    detect: () => existsSync(dirname(claudeDesktopConfigPath())),
    describe: 'Claude 桌面版',
    plan: () => `${claudeDesktopConfigPath()} → mcpServers["${SERVER_NAME}"]`,
    apply: () => {
      patchJsonFile(claudeDesktopConfigPath(), (cfg) => {
        cfg.mcpServers ??= {}
        if (remove) delete cfg.mcpServers[SERVER_NAME]
        else cfg.mcpServers[SERVER_NAME] = { command: NODE_BIN, args: [SERVER_ENTRY] }
        return cfg
      })
    },
  },
  {
    name: 'cursor',
    detect: () => existsSync(join(homedir(), '.cursor')),
    describe: 'Cursor',
    plan: () => `${join(homedir(), '.cursor', 'mcp.json')} → mcpServers["${SERVER_NAME}"]`,
    apply: () => {
      patchJsonFile(join(homedir(), '.cursor', 'mcp.json'), (cfg) => {
        cfg.mcpServers ??= {}
        if (remove) delete cfg.mcpServers[SERVER_NAME]
        else cfg.mcpServers[SERVER_NAME] = { command: NODE_BIN, args: [SERVER_ENTRY] }
        return cfg
      })
    },
  },
  {
    name: 'vscode',
    detect: () => true, // 项目级配置，永远可写
    describe: 'VS Code（本仓库项目级）',
    plan: () => `${join(BLOG_ROOT, '.vscode', 'mcp.json')} → servers["${SERVER_NAME}"]`,
    apply: () => {
      patchJsonFile(join(BLOG_ROOT, '.vscode', 'mcp.json'), (cfg) => {
        cfg.servers ??= {}
        if (remove) delete cfg.servers[SERVER_NAME]
        else cfg.servers[SERVER_NAME] = { type: 'stdio', command: NODE_BIN, args: [SERVER_ENTRY] }
        return cfg
      })
    },
  },
  {
    name: 'claude-code',
    detect: () => hasCommand('claude'),
    describe: 'Claude Code CLI',
    plan: () =>
      remove
        ? `claude mcp remove ${SERVER_NAME} -s user`
        : `claude mcp add ${SERVER_NAME} -s user -- node ${SERVER_ENTRY}`,
    apply: () => {
      const cmd = remove
        ? `claude mcp remove ${SERVER_NAME} -s user`
        : `claude mcp add ${SERVER_NAME} -s user -- ${JSON.stringify(NODE_BIN)} ${JSON.stringify(SERVER_ENTRY)}`
      execSync(cmd, { stdio: 'inherit' })
    },
  },
]

// ---------- 工具函数 ----------

function hasCommand(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** 读取 JSON（不存在/损坏则从 {} 开始），fn 返回新的 cfg 并格式化写回 */
function patchJsonFile(filePath, fn) {
  let cfg = {}
  if (existsSync(filePath)) {
    const backup = `${filePath}.bak-mcp`
    copyFileSync(filePath, backup)
    console.log(`  ├ 备份原配置 → ${backup}`)
    try {
      cfg = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch {
      console.warn(`  ├ ⚠ ${filePath} 不是合法 JSON，已按空配置处理（原文件保留在备份里）`)
      cfg = {}
    }
  }
  const next = fn(cfg) ?? cfg
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(next, null, 2) + '\n')
}

// ---------- 执行 ----------

const wanted = TARGETS.filter((t) => !only || only.includes(t.name))
const available = wanted.filter((t) => {
  const ok = t.detect()
  if (!ok) console.log(`⏭  ${t.describe}：未检测到安装，跳过（手动配置见 mcp/README.md）`)
  return ok
})

if (available.length === 0) {
  console.log('\n没有可用的目标。手动配置方法见 mcp/README.md')
  process.exit(0)
}

console.log(`\n${remove ? '移除' : '注册'} Leon's Blog MCP（${SERVER_ENTRY}）\n`)
for (const t of available) {
  console.log(`${remove ? '➖' : '➕'} ${t.describe}`)
  console.log(`  └ ${t.plan()}`)
}

if (!yes) {
  console.log('\n以上是 dry-run 预览。确认无误后加 --yes 实际写入：')
  console.log(`  node bin/mcp-install.mjs ${remove ? '--remove ' : ''}--yes`)
  process.exit(0)
}

console.log('')
for (const t of available) {
  try {
    t.apply()
    console.log(`✔ ${t.describe} — 完成`)
  } catch (err) {
    console.error(`✘ ${t.describe} — 失败: ${err.message}`)
  }
}

console.log(
  remove
    ? '\n已移除。重启对应客户端后生效。'
    : '\n完成！重启对应客户端（Claude Desktop / Cursor / VS Code）或新开 Claude Code 会话即可使用。\n验证方法：问 Agent「用 leon-blog 的 MCP 搜一下 rust 相关文章」。',
)
