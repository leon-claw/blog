# Next.js 博客迁移施工计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Hexo 8 + keep 主题博客迁到 Next.js App Router：全站 SSG、功能清单不减、附带通用 HTTP 实验接口 v0。

**Architecture:** 单 Node 进程（next standalone）承载 SSG 页面 + `/api/*` route handlers；内容经 `bin/sync-articles.mjs` 落盘 `content/posts/*.md`，构建期解析（gray-matter → 类型化索引；remark/rehype + shiki 双主题）；视觉以 `docs/design/design-dna.json` 为 token 基线用 Tailwind v4 重设计；MCP 服务代码不动、仅 URL 规则适配（冒烟测试兜底）。

**Tech Stack:** Next.js 15 (App Router/TS)、React 19、Tailwind CSS v4、gray-matter、unified (remark/rehype)、shiki、vitest + @testing-library/react。

**Spec:** `docs/superpowers/specs/2026-10-25-nextjs-migration-design.md`（本计划从 spec 出发执行，两份文档随行）

## Global Constraints

- 迁移期间旧 Hexo 直出链路保持可用到最后一刻；退役放在最后一个任务
- URL 表（spec §6，唯一 allowed 列表）：`/`、`/page/:n`、`/posts/:slug`、`/archives`、`/tags`、`/tags/:tag`、`/about`、`/api/*`、404
- slug = 中文文件名原样（URL-encoded），`per_page = 10`
- 站点常量：title `Leon's Blog`、author `Leon`、url `https://jianghong.site`、语言 `zh-CN`、timezone `Asia/Shanghai`
- 暗色 = `<html>` 加 `.dark-mode` class 策略 + localStorage key `theme` + `prefers-color-scheme` 初次兜底；无闪白（pre-hydration 注入）
- 实验接口：只读语义、无 CORS 头、无状态码白名单外跳转；`/api/delay` cap=10s；限频 30 req/min/IP；响应体上限 1MB（echo body 截断展示）
- `private/` 与私密内容绝不出现在：`content/posts/` 同步输出、MCP 索引、任何构建产物（现状已有断言 `mcp/test-smoke.mjs` 保持全绿）
- 不引入：评论、搜索、统计、MDX（`<TryIt>` 以 React 组件形式在文章页用手动嵌入式提供，首个用例在 `/api` 文档页）
- 每任务独立可验收；Commit 策略见 Execution Handoff（AGENTS.md：未经用户明确许可不 commit）

## Review Focus

1. **中文 slug 编码不对称**——`generateStaticParams` 返回未编码 slug，请求路径是编码串，不 decode 就 404。测试：Task 5 Step 1 对 fixture 中文 slug 断言 params 匹配。
2. **一言 API 失败路径**——超时/非 200/空句必须回退本地文案继续打字，禁止 NaN/永久卡顿。测试：Task 8 Step 1 fake timers + reject fetch。
3. **私密草稿泄漏**——`article-src/private/**` 任一文件混入同步输出即事故。测试：Task 2 Step 1 断言 `private/` 名下的 md 不被产出。
4. **实验接口被滥用**——限频满后和 429 + Retry-After，非法 delay >10 返回 400，`/api/headers` 拒绝白名单外响应头。测试：Task 9/10 各自 Step 1。
5. **暗色首帧闪白**——`<head>` 内联脚本必须在首帧注 `.dark-mode`。测试：Task 7 Step 1 对 layout 渲染产物断言 script 在 head 且先于 body。

---

### Task 1: Next 脚手架 + 设计 token

**Files:**
- Rewrite: `package.json`（移除全部 hexo-* 依赖前置到 Task 13；本任务**新增并共存**：next/react/tailwind/vitest 等；scripts 增加 `dev`/`build`/`start`/`test`，保留 mcp scripts；`hexo` scripts 暂留）
- Create: `next.config.ts`（`output: 'standalone'`）、`tsconfig.json`（paths `@/*` → `src/*`）、`postcss.config.mjs`、`src/app/layout.tsx`、`src/app/page.tsx`（占位）、`src/config/site.ts`、`src/styles/globals.css`、`vitest.config.ts`、`src/config/site.test.ts`
- Create: `src/types/global.d.ts`

**Interfaces:**
- Produces: `SITE`（`{ title: "Leon's Blog"; author: "Leon"; url: "https://jianghong.site"; description: string（伍德首屏引言全文，逐字复制 DNA §meta 对应文句）; language: "zh-CN"; timezone: "Asia/Shanghai" }`）；vitest 可执行；`npm run build` 走通出 standalone 产物

- [ ] **Step 1: 写 site.ts 的失败单测**（`src/config/site.test.ts`：断言 `SITE.url === "https://jianghong.site"`、`SITE.title === "Leon's Blog"`、`SITE.description.includes("人迹更少")`）
- [ ] **Step 2: `npm test` 预期 FAIL（模块不存在）**
- [ ] **Step 3: 实现**——手写脚手架（版本 next@15/react@19/tailwindcss@4）；`globals.css` 按 DNA 落 `@theme`（主色 `#0066cc`/`#0075eb`，暗色面 `#22272e`/`#292f38`，文字 `#50505c`/`#adbac5`，radius `8px`，单动效 `0.2s ease`，字体栈 `Optima-Regular, Optima, PingFang SC, Microsoft YaHei, sans-serif`，mono `"Source Code Pro", consolas, Menlo`）
- [ ] **Step 4: `npm test` PASS 且 `npm run build` 成功**（`next build` 输出含 `/` 静态页）
- [ ] **Step 5: Commit**（若已获授权）

### Task 2: 内容管线与 Post 索引

**Files:**
- Modify: `bin/sync-articles.mjs`（`POSTS_DIR` → `content/posts`；`IMG_OUT` → `public/images/articles`）
- Create: `src/lib/posts.ts`、`src/lib/posts.test.ts`、`tests/fixtures/content/posts/*.md`（含：正常 front-matter、无 front-matter 需兜底场景各 1 篇、文件名即中文 slug 1 篇如 `进度条那些事.md`）

**Interfaces:**
- Produces: `interface Post { slug; title; date: string; updated: string; tags: string[]; content: string }`
- `getAllPosts(): Post[]`（date 降序）/ `getPostBySlug(slug: string): Post | undefined` / `getAllTags(): { tag: string; count: number }[]` / `getPostsByTag(tag: string): Post[]` / `PAGINATION_SIZE = 10`、`paginate(list: Post[], page: number): { posts; total; page; pages }`（page<1 → page 1；page>pages → 空数组 pages）
- 调用方：Task 4/5/6 各页面、Task 12 MCP（slug 概念对齐）

- [ ] **Step 1: 失败测试**——fixtures 目录注入临时 access（`README` 支持以环境变量指向自定义目录 `POSTS_SRC`; 测试用 fixtures）：`getAllPosts()` length=3 且 date 降序；`getPostBySlug("进度条那些事")?.title` 非空；`private` 目录名下的 md 不出现在结果；`paginate([…11 篇], 2).posts.length === 1 && pages === 2`
- [ ] **Step 2: `npm test` FAIL**
- [ ] **Step 3: 实现 posts.ts**（gray-matter；`updated` 默认 = `date`；date 解析失败 → 以 slug 的文件 mtime 兜底）；同步修改 sync-articles.mjs 两个路径常量
- [ ] **Step 4: `npm test` PASS；`node bin/sync-articles.mjs` 将 67 篇落入 `content/posts/` 且无 `private*` 残留**
- [ ] **Step 5: Commit**

### Task 3: Markdown 渲染 + 双主题高亮 + 读取指标

**Files:**
- Create: `src/lib/markdown.ts`、`src/lib/markdown.test.ts`、`tests/fixtures/markdown/dual-theme.md`、`toc.md`、`zh-dense.md`

**Interfaces:**
- Produces: `renderMarkdown(md: string): Promise<{ html: string; toc: Heading[] }>`，`Heading = { level: 2 | 3; id: string; text: string }`；`readingMetrics(md: string): { chars: number; minutes: number }`（去代码块/图片语法；`minutes = max(1, ceil(chars / 400))`）
- 调用方：Task 5 详情页、Task 6 about 页

- [ ] **Step 1: 失败测试**——`html` 含 `data-language="ts"` 的 `pre`；`toc` 对 h2/h3 收集 3 项且 id 与正文 anchor 一致；`chars` 不计 fenced code 内容；`minutes === 1`（短文）
- [ ] **Step 2: `npm test` FAIL**
- [ ] **Step 3: 实现**——`remark-parse` + `remark-rehype` + `rehype-slug` + `shiki`（双主题：`github-light` / `github-dark-dimmed`，CSS vars 驱动明暗切换；与 DNA 的 Tomorrow/#1f242a 呈近似映射，deviation 备注进设计文档 §5）
- [ ] **Step 4: `npm test` PASS**
- [ ] **Step 5: Commit**

### Task 4: 首页 + 文章卡 + 分页

**Files:**
- Create: `src/app/page.tsx`、`src/app/page/[page]/page.tsx`、`src/components/PostCard.tsx`、`src/components/TagPill.tsx`、`src/components/Pagination.tsx` + `PostCard.test.tsx`
- Modify: `src/app/layout.tsx`（head metadata + body 全局字体）

**Interfaces:**
- Consumes: Task 2 `getAllPosts/paginate`
- Produces: `PostCard({ post })`（展示 title、date、updated、tags pill）；分页 URL 规则 `/page/:n`（n≥2 才有该路由）

- [ ] **Step 1: 失败测试**——RTL：PostCard 渲染出 h2 标题与 tag pill；Pagination 在 `pages>1` 时含 `page/2` 链接、`pages===1` 时 null
- [ ] **Step 2: FAIL → Step 3: 实现（页面侧以 `getAllPosts/paginate(…, Number(param||1))` 驱动；`/` = 第 1 页）→ Step 4: PASS + `npm run build` 产物含 `/` 与 `/page/2` → Step 5: Commit**（此处 4 步合并为标准 TDD 循环）

### Task 5: 文章详情页（SSG）

**Files:**
- Create: `src/app/posts/[slug]/page.tsx`、`src/components/Prose.tsx`（排版容器，代码块明暗双 token）、`src/components/Toc.tsx`（桌面 ≥1024px 右侧悬浮，纯展示 + IntersectionObserver 高亮为唯一 client 内交互）
- Test: `src/app/posts/[slug]/page.test.ts`（helpers 抽测）

**Interfaces:**
- Consumes: Task 2 `getPostBySlug/getAllPosts`、Task 3 `renderMarkdown/readingMetrics`
- Produces: `generateStaticParams()` 返回全量中文 slug（`decodeURIComponent(reqPath)` 由 Next 自动完成，断言不重复 encode）；`generateMetadata` 输出 title/description
- 相邻导航：`getAdjacentPosts(slug)` 返回 `{ prev, next }`（放入 posts.ts，单测含边界链表：最早篇 prev=undefined）

- [ ] **Step 1: 失败测试**——`generateStaticParams()` 包含 `"进度条那些事"` 且全量唯一；`getAdjacentPosts` 首/尾边界 prev/next 为 undefined
- [ ] **Step 2: FAIL → Step 3: 实现页面（`notFound()` 兜底未知 slug；meta 行三件套：date/updated/字数·分钟）→ Step 4: PASS + build 产物 /posts/*.html 数 = 文章数 → Step 5: Commit**

### Task 6: 归档 / 标签 / 关于 / 404

**Files:**
- Create: `src/app/archives/page.tsx`、`src/app/tags/page.tsx`、`src/app/tags/[tag]/page.tsx`、`src/app/about/page.tsx`、`src/app/not-found.tsx`、`content/pages/about.md`（从现状 `source/about/index.md` 拷贝正文）、`src/lib/group.ts` + 测试

**Interfaces:**
- Consumes: Task 2 与 Task 3 输出
- Produces: `groupByYear(posts): { year: string; posts: Post[] }[]`（降序）

- [ ] **Step 1: 失败测试**（groupByYear 两项排序 + 数量归集）→ Step 2 FAIL → Step 3 实现 → Step 4 PASS + build 产物含 `/archives/`、`/tags/rust读后感/`（中文标签 encode）→ Step 5 Commit

### Task 7: Header / 主题切换 / 滚动三件套

**Files:**
- Create: `src/components/Header.tsx`、`src/components/ThemeToggle.tsx`、`src/components/ScrollChrome.tsx`（进度条 + header 收缩/毛玻璃，单 client 组件）+ 各自 test；Modify `layout.tsx`（head 内联 pre-hydration script）
- 常量键：`THEME_STORAGE_KEY = "theme"`；scroll 阈值 = `--header-height` = 70px；收缩后高度 50px；blur 4px

**Interfaces:**
- Produces: `ThemeToggle`（点击切换 `documentElement.classList` + localStorage 写入）；`ScrollChrome`（滚动时给 header 加 `.is-scrolled`、进度条宽度 = 滚动百分比）
- 消费方：layout 固定头部；DNA token 已在 Task 1 落好

- [ ] **Step 1: 失败测试**——RTL + jsdom：点击 toggle 后 `html.classList.contains("dark-mode")` 且 `localStorage.theme === "dark"`，再点恢复；fire `scrollY=120` 后 header 具 `.is-scrolled`、进度条 style 宽度非 0；layout 渲染 string 的 `<head>` 里断言存在 `theme` 内联 script 且位于 body 之前
- [ ] **Step 2 FAIL → Step 3 实现 → Step 4 PASS → Step 5 Commit**

### Task 8: 首屏 + 打字机（签名组件）

**Files:**
- Create: `src/components/FirstScreen.tsx`（Liquid 全屏 cover 背景 + 中央标题金句容器，client）、`src/components/Typewriter.tsx`、`public/images/bg/light.svg` + `dark.svg`（复制现网素材）+ tests
- 常量（与旧 relay-typewriter.js 等价）：`TYPE_SPEED_MS = 120`、`WAIT_BEFORE_TYPING_MS = 800`、`HITOKOTO_TIMEOUT_MS = 4000`、粃okoto 分类 `["a","b","d","k"]`、多行分隔 token `"｜|"`、回退文案 = `SITE.description`

**Interfaces:**
- Consumes: `SITE.description`；`fetch` 端点 `https://v1.hitokoto.cn/?c=a&c=b&c=d&c=k`（句源 `data.hitokoto`）
- Produces: 首页顶部 `<FirstScreen />`；`Typewriter({ lines: string[], fallbackLine: string })`
- 无障碍：`prefers-reduced-motion` 时直接静态显示文案不打字（spec §visual_effects fallback）

- [ ] **Step 1: 失败测试**（RTL + fake timers）：fetch reject → 打出 fallback 全文且逐字增长；fetch resolve `"一禾一句"` → 打出该句；行含 `｜|` → 两行接力（前一行为打完后下一行才开打）；`prefers-reduced-motion: reduce` mock 后 DOM 直接含完整文案且无逐字 interval
- [ ] **Step 2 FAIL → Step 3 实现 → Step 4 PASS → 首页 build 产物含背景 svg 引用 → Commit**

### Task 9: 实验接口（一）：限频 + 回显族

**Files:**
- Create: `src/lib/rate-limit.ts` + test、`src/app/api/echo/route.ts`、`/api/ip/route.ts`、`/api/ua/route.ts`、`/api/status/[code]/route.ts` + handlers tests
- 常量：`RATE_LIMIT = 30/min`（超限 429 + `Retry-After: 60`）；echo body 截断至 1MB，`?raw=1` 返回纯文本

**Interfaces:**
- Produces: `withRateLimit(handler: (req: Request) => Promise<Response>): Promise<Response>`（内存 token bucket，key = `x-forwarded-for` 首段 / `remote`）；测试通过同一 store 逐 IP 灌满验证
- `echo` 返回 `{ method, path, query, headers, ua, body? }`；`status/[code]` 校验 `[200,599]` 之外 → 400 + 说明；`ip`/`ua` 返回单行

- [ ] **Step 1: 失败测试**——同一模拟 IP 连打 31 次，第 31 次 429 且含 `Retry-After`；`status/abc` → 400；echo 对 POST body 与 headers 逐字段回显
- [ ] **Step 2 FAIL → Step 3 实现 → Step 4 全 PASS（30/min 校验用 unique IP 分别跑以免相互污染）→ Commit**

### Task 10: 实验接口（二）：行为演示族

**Files:**
- Create: `src/app/api/delay/[seconds]/route.ts`、`/api/redirect/route.ts`、`/api/cookies/route.ts`、`/api/cache/route.ts`、`/api/headers/route.ts` + tests
- 常量：delay cap `10`（超 → 400）；redirect `?to=…&times=n`（默认 1）；headers 白名单：`x-demo-retry-after`、`x-demo-ratelimit-limit`、`link`、`custom-status`

**Interfaces:**
- Consumes: Task 9 `withRateLimit` 包装全部 route
- Produces: `delay/:n`（sleep n 秒，n 为 0–10 整数）；`redirect` 302 链；`cookies?op=set|get|clear&k=&v=` 写/读/清；`cache` 固定 `Cache-Control: max-age=60` + ETag 语带 304 分支；`headers` 白名单诶拒绝名词任意注入（白名单外 → 400 列出允许名单）

- [ ] **Step 1: 失败测试**——`delay/11` → 400；`redirect?times=3` 首跳 Location 携 `?step=1` 语义（用链式自身 query 实现递减）；`headers?x-demo-retry-after=5` 响应含该头；`headers` 未知名字 → 400
- [ ] **Step 2 FAIL → Step 3 实现 → Step 4 PASS → Commit**

### Task 11: TryIt 演示组件 + `/api` 说明页

**Files:**
- Create: `src/components/TryIt.tsx` + test、`src/app/api/page.tsx`（接口目录页，v0 端点列表 + 每端点一个 TryIt）

**Interfaces:**
- Consumes: Task 9/10 endpoints（文档页仅需 URL 常量表 `API_CATALOG`）
- Produces: `TryIt({ label: string; method: "GET"; url: string; note?: string })`——点击后同域 fetch，展示 status / 关键响应头 / 截断 2KB body

- [ ] **Step 1: 失败测试**——mock fetch → 渲染 status 与 body 摘要；请求失败渲染错误行
- [ ] **Step 2 FAIL → Step 3 实现 → Step 4 PASS → Commit**

### Task 12: MCP URL 适配 + 数据源换路

**Files:**
- Modify: `mcp/lib/store.mjs`① 数据源目录 `source/_posts` → `content/posts`（Task 2 已改同步输出，此处换读位；否则 Task 13 删旧目录后 MCP 断数据）；② urlFor: permalink 固定 `"/posts/:slug"`；③ `cfg.url` 缺省值改 `https://jianghong.site`（原先 example.com 占位 → 空串降级逻辑保留为未设 url 环境的兜底）
- Test: `mcp/test-smoke.mjs` 全量跑（现有 11 assert 即验收，无需新增）

**Interfaces:**
- Produces: `list_posts/get_site_info` 返回的 `url` 形如 `https://jianghong.site/posts/<slug>`
- 与 Task 2 slug 概念一致（同串同编码）

- [ ] **Step 1: 改前跑 smoke 记录当前绿 → Step 2: 实现 → Step 3: `node mcp/test-smoke.mjs` 11 项全过（任何断言依赖旧 permalink 形态则按新 URL 表更新断言并注明）→ Step 4: Commit**

### Task 13: 退役 Hexo + 部署物料 + 终验

**Files:**
- Modify: `package.json`（删 hexo-*、hexo scripts；`build` = `next build`；`test` 保留）、`.gitignore`（+ `.next/`、`out/`；- `db.json` 残留行）、`public/`（原产物目录删除、git rm --cached 历史产物清除）、`_config.yml`、`_config.keep.yml`（删除）
- Create: `docs/deploy/launchd/`（th-blog-next.plist 示例，`org.nohow.blog`，`/Users/leon.w/.nvm/…/node … blog/.next/standalone/server.js`，`PORT=3100`)、`nginx.conf.location.example`（`location / { proxy_pass http://127.0.0.1:3100; }` + `/_next/static` 直出现场叠法）
- Modify: `AGENTS.md`（管线描述 source/_posts → content/posts；MCP URL 规则文案同步）
- Create: `docs/superpowers/plans/2026-10-25-nextjs-migration-checklist.md`（§11 验收清单逐项可跑命令）

**Interfaces:**
- Produces: 全部验收可执行；`npm run build && npm start` 单起服务；旧 Hexo 链路彻底退役（保留 git 历史回溯）

- [ ] **Step 1: 干跑验收清单**——build 产物 HTML 数＝67 文章页 + 4 类静态页；`/api/echo` POST 一次；打字机两分支（mock 断网手测）；MCP smoke 全绿；`git status` 仅含本计划新增/修改文件
- [ ] **Step 2: Commit**（终验物料）

---

## Self-Review 结果

1. **Spec 覆盖**：§2.1 功能 12 项 → Task 4/6（1,3,4,5,12 项架构面）、7（7,8）、8（2）、5（6）、9/10（9）、11（演示组件）、12（11）、6（404）；§2.2/2.3 反非目标以 Global Constraints 封顶；§7 端点 8 个 → Task 9/10 全覆盖；§8 MCP → Task 12；§9 管线 → Task 2；§10 部署 → Task 13；§11 验收 → Task 13 Step 1 checklist。无缺口。
2. **Step 扫描**：Task 4/5/6/7/8 的「FAIL→实现→PASS→Commit」采用合并写法（四步一行），行为锚点在 Step 1 测试断言里，无 TBD/空指令；测试均给了一项可写字断言。
3. **类型一致**：`Post`/`renderMarkdown`/`withRateLimit`/TryIt 接口签名在各任务 Interfaces 区一致复述；`PAGINATION_SIZE=10`、`RATE_LIMIT=30`、delay cap `10`、storage key `theme`、端口 3100 全文一致。
4. **Review Focus 5 条均落测试**：①Task 2 fixtures 含中文 slug + Task 5 params 全量；②Task 8 Step 1 fetch reject 分支；③Task 2 Step 1 private 排除断言；④Task 9 Step 1 限频/400、Task 10 Step 1 白名单拒绝；⑤Task 7 Step 1 head script 位置断言。
5. **比例**：13 个任务 ≈ 每任务 5 步，测试断言承载设计值，正文无源码转录。
