#!/usr/bin/env node
/**
 * 同步 Leonw26/article 仓库的文章到 Next.js content/posts
 *
 * 用法：node bin/sync-articles.mjs
 *  1. article-src/ 不存在时自动 clone，否则 git pull 更新
 *  2. 根目录 *.md（跳过 private/）补充/规范 front matter 后写入 content/posts/
 *     - 已有 front matter（所有文章自带 title/date/tags）仅透传，不做改动
 *  3. 附带 article-src/images/ -> public/images/articles/，并转换 Obsidian 图片语法
 *     `![[./images/xx.png]]` -> `<img src="/images/articles/xx.png">`
 *     （marked 不支持 wiki 嵌入语法，直播出 HTML 兜底；图片随文章同步到 public/images/articles/）
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs'
import { join, basename } from 'node:path'
const REPO = 'https://github.com/Leonw26/article.git'
const SRC_DIR = 'article-src'
const POSTS_DIR = 'content/posts'
const IMG_OUT = 'public/images/articles'
const SKIP_DIRS = new Set(['private']) // 草稿/私密目录不同步

// 取文章在 git 历史中的最早提交时间（兜底 front matter 没写 date 时用）
function firstCommitDate(repo, file) {
  try {
    return execSync(`git -C ${repo} log --format=%ad --date=iso --reverse -- ${JSON.stringify(file)}`, { encoding: 'utf8' })
      .trim().split('\n')[0] || null
  } catch {
    return null
  }
}

// ---- 1. 获取最新仓库 ----
if (!existsSync(SRC_DIR)) {
  execSync(`git clone ${REPO} ${SRC_DIR}`, { stdio: 'inherit' })
} else {
  try {
    execSync(`git -C ${SRC_DIR} pull --ff-only`, { stdio: 'inherit' })
  } catch (e) {
    // pull 失败（离线/分叉）不影响本地迁移：沿用现有 article-src 继续同步
    console.warn('⚠ git pull 失败，使用本地 article-src 现状继续：' + e.message)
  }
}

// ---- 2. 同步图片目录 ----
if (existsSync(SRC_DIR + '/images')) {
  rmSync(IMG_OUT, { recursive: true, force: true })
  mkdirSync(IMG_OUT, { recursive: true })
  cpSync(SRC_DIR + '/images', IMG_OUT, { recursive: true })
  console.log('✔ images 已同步到 ' + IMG_OUT)
}

// ---- 3. 转换并输出文章 ----
// 文章自带 front matter（title/date/tags）仅透传；缺 --- 头的注入 title/date 兖底
mkdirSync(POSTS_DIR, { recursive: true })
let count = 0
let patched = 0
for (const file of readdirSync(SRC_DIR)) {
  if (!file.endsWith('.md')) continue
  let raw = readFileSync(join(SRC_DIR, file), 'utf8')

  if (!raw.startsWith('---')) {
    const d = firstCommitDate(SRC_DIR, file)
    const fallback = ['---', `title: ${file.replace(/\.md$/, '')}`, d ? `date: ${d}` : null, '---', ''].filter(Boolean).join('\n')
    raw = fallback + raw
    patched++
  }

  // Obsidian wiki 图片语法 -> <img> 绝对路径
  raw = raw.replace(/!\[\[\s*\.?\/?images\/([^\]|]+?)(\|[^\]]*)?\s*\]\]/g,
    (_, name) => `<img src="/images/articles/${name.trim()}" alt="${basename(name.trim())}">`)

  writeFileSync(join(POSTS_DIR, file), raw)
  count++
}
console.log(`✔ 已同步 ${count} 篇文章到 ${POSTS_DIR}/${patched ? `（为 ${patched} 篇注入了兜底 front matter）` : ''}`)
