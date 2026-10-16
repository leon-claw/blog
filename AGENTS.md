# AGENTS.md — blog 项目记忆

个人博客。Hexo 8 + hexo-theme-keep 4.3 主题。文章来自 Leonw26/article 仓库。
远程：https://github.com/leon-claw/blog（main 分支）。

## 常用命令

```sh
npx hexo clean && npx hexo generate        # 清理 & 构建到 public/
npm run server / npx hexo server           # 本地预览 http://localhost:4000
node bin/sync-articles.mjs                 # 拉取文章仓库并同步到 source/_posts
node bin/test-first-screen.mjs [ms]        # jsdom 无头验证首屏打字机（自带静态服务器）
```

## 目录结构

- `_config.yml` — Hexo 站点配置（站点名/语言/时区/theme: keep）
- `_config.keep.yml` — 主题配置覆盖（独立于主题目录，升级不丢；inject 的 js 在这里）
- `source/_posts/*.md` — 文章（66 篇，全部带 front matter: title/date/tags）
- `source/images/articles/` — 文章配图（sync 脚本从 article-src/images 拷贝）
- `source/custom/js/relay-typewriter.js` — 首屏打字机（inject 注入，唯一自定义脚本）
- `bin/sync-articles.mjs`、`bin/test-first-screen.mjs` — 工具脚本
- `article-src/` — 文章仓库的 clone（已 gitignore，勿在博客里直接改里面内容）

## 文章同步规则（bin/sync-articles.mjs）

- 只同步 article-src 根目录的 `*.md`；`private/` 目录视为草稿，**跳过不同步**
- `images/` → `source/images/articles/`；缺失 date 的文章注入 front matter（title 用文件名，date 用 git 首次提交时间）
- 文章日期一律用 front matter 的 date（站内 `post_datetime: updated` 显示的是 updated，构建环境 mtime 无意义）

## 首屏打字机机制（source/custom/js/relay-typewriter.js）

设计上"接管"主题的打字机，当前模式：**一言 API 优先，失败回退本地文案**（`first_screen.custom_hitokoto: true`，不开启主题原生 `hitokoto: true`）。

时序约定（改动前必读）：

1. 主题在 `<head>` 内用 **`const KEEP = window.KEEP || {}`** 暴露配置——这是**脚本级词法全局**，挂不上 `window`；主题源码全部用裸标识符 `KEEP` 访问。**用 `window.KEEP` 读取永远是 undefined**（曾踩坑）
2. inject 注入的 JS 无 async/defer，在 body 末尾**同步执行**（早于 DOMContentLoaded）
3. 主题 home-page.js 在 **DCL+300/400ms** 读取 `.desc` 的 innerHTML 并打字；脚本需在其中**提前清空文案**让主题 no-op（保留其 opacity 淡入），打字由自定义脚本独占
4. 自定义脚本等待 **800ms（WAIT_BEFORE_TYPING）** 过了主题窗口后再开始打字，防止 fetch 快速返回导致双重驱动
5. 一言请求用 `Promise.race` 超时（不用 AbortSignal，兼容 jsdom 等非浏览器环境）
6. 单行打完即停、光标隐藏（同官方 demo）；多行接力需要 ｜| token 拆分

## 踩坑记录

- **根目录 `scripts/` 会被 Hexo 当作插件目录加载**（当成 Node 模块执行，浏览器全局全错）——自定义 JS 放 `source/custom/`，站点 URL 为 `/custom/...`
- 主题配置 `first_screen.description` 里的 `||` 会被渲染成多个 `.desc-item`（多个打字机同时跑）；多行 turns 由自定义脚本负责，配置只写一段
- 主题的 `![[images/xx]]`（Obsidian 语法）marked 渲染不了；sync 脚本运行时转成 `<img>` 绝对路径
- jsdom 里 `element.innerText` 在未布局时是 undefined，取文本用 `textContent`
- jsdom 的 window.AbortSignal 与 Node 的 fetch 不互通（instanceof 校验失败），所以 fetch 超时用 Promise.race
- 文章文案的"接力"/"随机"逻辑都在运行时 JS，Anything 静态解析做不到（构建期文案已固化进 HTML）

## GitHub / 账号

- gh CLI 登录的是 **leon-claw**；文章仓库 Leonw26/article 是另一个账号
- 部署（GitHub Pages / Actions workflow）**尚未配置**
- 推送惯例：改完即 `git push`（远程已配好）

## 用户偏好

- 中文交流；commit message 英文 conventional 风格
- 喜欢 xpoet.cn 首页风格：全屏 SVG 动画背景（source/images/bg/light.svg dark.svg，取自官方 demo，个人使用）+ 打字机金句，社交图标/进度条/字数统计都已开
