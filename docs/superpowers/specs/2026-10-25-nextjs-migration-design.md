# 设计文档：博客迁移到 Next.js（Leon's Blog）

- 日期：2026-10-25
- 状态：待用户批准
- 设计 DNA 基线：`docs/design/design-dna.json`（keep 主题现状快照，重设计在其上**演进而非像素级复刻**）
- 附：本项目规则——**未经用户明确要求不执行 git commit / push**，同规则也适用于本项目内例行操作

---

## 1. 意图与动机

把 Hexo 8 + hexo-theme-keep 的博客整体迁移到 **Next.js（App Router + React）**。动机是**技术栈现代化**，用户已明确：页面速度不是验收标准（做成 React 技术栈，性能红利顺带拿）。站点上线于 `https://jianghong.site`（VPS，可常驻 Node）。

两个此前被搁置的能力在本次一并落地：

1. **文章全量 SSG**——构建期生成所有页面；
2. **通用 HTTP 行为实验接口**——一个自建 httpbin 式的后端，用于写作“bug 复现”类文章时提供可直接调用的端点（如观察不同 HTTP 头的效果）。

## 2. 目标 / 非目标 / 反目标

### 2.1 目标（功能清单 = 验收基线，逐项不减）

| # | 功能 | 现状形态 | 迁移后 |
|---|------|---------|--------|
| 1 | 首页 | 文章卡片流（标题/发布与更新时间/分类/标签 pill），10 篇分页 | 同左，SSG |
| 2 | 首屏 | 100vh 动态 SVG 插画（SMIL，light/dark 两套）+ 金句打字机（一句话 API 4s 超时回退本地文案） | 原素材路由见 §6，打字机改 React 客户端组件 |
| 3 | 归档 | `/archives` 按年月分组列表 | 同左 |
| 4 | 标签 | `/tags` 聚合页 + 每标签文章列表页 | 同左 |
| 5 | 关于 | `/about` Markdown 页 | 同左 |
| 6 | 文章详情 | 标题、创建/更新时间、字数统计、阅读时长、TOC、代码高亮（light=Tomorrow/dark=GitHub-Dim 感）、行号 | 同左（字体 token 以 DNA 为基线） |
| 7 | 加载与滚动 | 2px 主色顶部进度条；header 70→50px 收缩 + 4px 毛玻璃（透明→实底） | 同左 |
| 8 | 暗色模式 | 根节点 `.dark-mode` class，JS 持久化切换 | 同策略（right class 切换，支持系统偏好兜底） |
| 9 | 通用接口 | 无 | §7 HTTP 行为实验 API |
| 10 | 内容管线 | `Leonw26/article` 仓库 → `bin/sync-articles.mjs`（跳过 `private/`、注入兜底 front-matter、Obsidian 图片语法转换） | 脚本保留，仅输出目录改为新布局 |
| 11 | MCP 检索 | `mcp/server.mjs`（stdio + HTTP/token），独立进程 | 代码不动，URL 规则适配见 §8 |
| 12 | 404 | 静态页 | 同左，套用新视觉 |

### 2.2 非目标（本次明确不做）

- 社交模块（social_contact）：现配置为占位值（yourname/you@example.com），用户确认**本次去除**，新站不重建该区块
- 评论系统、站内搜索、访问统计（现状没有，不引入）
- 旧 URL（`/YYYY/MM/DD/中文标题/`）兼容与 301——直接使用新结构
- ISR / SSR（全部文章页 SSG；API 路由是唯一的运行时部门）
- 改动 `Leonw26/article` 源仓库的写作流程
- 对 MCP 服务做功能增量（只做 URL 规则适配）

### 2.3 反目标（宁可不做也不能做的）

- 为还原 keep 主题像素样式而把 jQuery 时代 DOM 操作思路搬到 React 里
- 首屏动效阻塞内容可读性（LCP 前插画不可白屏占位超时）
- 实验接口变成可写/可代理的安全面（只读回显，无转发语义）

## 3. 约束

- **部署**：VPS 为 macOS（Homebrew）机器，无 Docker/Caddy/hexo 运行时；公网入口是 Cloudflare Tunnel（cloudflared 进程，公网不开放）；本机 nginx 监听 `127.0.0.1:18100`，现状直出 Hexo 构建产物（`/opt/homebrew/etc/nginx/html/blog/`）；迁移后 nginx 改为反向代理本地常驻 Node（`next build` + `next start`，standalone output）
- **域名**：`jianghong.site`，TLS 在 Cloudflare 边缘终结，本机链路不新增证书工作
- **规模**：67 篇 `.md`（`source/_posts`），图片 ~332KB + 文章配图目录
- **供应链**：内容源头是外部仓库 `Leonw26/article`，经同步脚本落盘；`article-src/private/` 与生成物 `private/` 前缀目录任何阶段保持排除（私密草稿）
- **护栏**：`mcp/test-smoke.mjs`（11 项断言）在 MCP 适配后必须全绿；`bin/test-first-screen.mjs` 的思路（jsdom 观察首屏行为）可借鉴到新首屏的组件测试
- **链接依赖**：AGENTS.md 注明文章绝对链接依赖站点 url + permalink 规则，url 现为 example.com 占位会降级相对路径——迁移时顺带把真实 url 固化为 `https://jianghong.site`

## 4. 已定方案（对话中拍板的分叉）

| 分叉 | 备选 | 结论 | 理由 |
|------|------|------|------|
| 部署形态 | ① 纯静态导出（`output: 'export'`）/ ② Node 常驻 | **②** | 实验接口需要 route handlers；VPS 有常驻能力，矛盾消解 |
| URL 策略 | ① 保留 `/YYYY/MM/DD/中文标题/` + 兼容 ② `/posts/:slug` | **②**，且不做旧链接 301 | 中文编码路径难看且被永久继承；搜索引擎过渡期可接受 |
| 迁移路径 | ① Hexo/Next 渐进共存 ② 一步到位 | **②** | 67 篇规模 + 单 VPS 实例，共存期纯增复杂度 |
| 视觉方向 | ① 像素还原 keep ② 以 DNA 为基线重设计 | **②**（Tailwind + 设计 token）| 还原旧主题等于旧架构再写一遍；演进保留气质（见 DNA） |
| 实验接口形态 | ① 业务化复现接口 ② 通用 HTTP 行为服务 | **②**（无业务耦合，随文章需要扩展） | 用户明确“通用后端服务，不涉及业务” |

## 5. 技术选型（本次由助手定案，用户可在评审时推翻）

| 选择 | 理由 |
|------|------|
| Next.js **App Router** + React Server Components | 官方主推；文章页基本零客户端 JS，交互单元（打字机、主题切换、进度条、header 收缩）各自收敛成小客户端组件 |
| **TypeScript** 全仓 | 现代 Next 事实标准 |
| **Tailwind CSS v4** | 设计 token（来自 DNA）落成 CSS variables + `@theme`；首屏 SVG 插画与动效参数同样 token 化 |
| Markdown 管线：**构建期统一解析**（front-matter → 类型化 Post 索引；正文 remark/rehype 渲染） | 替代 Hexo db.json + EJS 运行时；67 篇构建期成本可忽略 |
| 代码高亮：**shiki**（双主题映射 DNA 里的 light=Tomorrow / dark=GitHub-Dim 配色，含行号 gutter） | 构建期静态高亮，零客户端运行时，天然还原两套配色。执行备注：实际选 `github-light`/`github-dark-dimmed`（与 Tomorrow/GitHub-Dim 为近似映射，非逐色一致，可接受） |
| \# 读取指标：`readingMetrics` 计「去空白后的文字量」（fenced code、图片、HTML 标签不计） | 单位「字」用于中文阅读时长（400字/分），空白不参与计量 |
| 文章 slug | 与文件名一致的**中文 slug**（URL-encoded），如 `/posts/svg画进度条延伸出来的知识点`；permalink 保持对用户可读、迁移零命名工作 |
| 暗色方案 | `class` 策略 + localStorage 持久化 + `prefers-color-scheme` 初次兜底（与 DNA `.dark-mode` 语义一致）；用 currentcolor/CSS var 保证无闪白 |
| 字体 | 系统字体栈（Optima/PingFang SC 感的中文栈），不 self-host 西文字体文件；如果你的 SEO/字形诉求变强再升级 next/font |
| 首屏插画 | 直接复用现有 `light.svg / dark.svg`（SMIL 素材自足），作为静态资源引入 |

## 6. 信息架构（最终 URL 表）

```
/                          首页（分页 /page/:n）
/posts/:slug               文章详情
/archives                  归档（按年分组）
/tags                      标签聚合
/tags/:tag                 标签文章列表
/about                     关于页
/api/*                     HTTP 行为实验接口（§7）
/404                       404 页
```

站点元信息（title/description/作者/语言 zh-CN/timezone Asia/Shanghai）沿用 `_config.yml` 当前值，收口到统一的 `site.config.ts`。

## 7. HTTP 行为实验接口（v0 端点集）

同进程 route handlers，命名空间 `/api/`。定位：**通用、无业务、只读回显**，写作按需引用，新端点随文章增加。

| 端点 | 行为 |
|------|------|
| `GET/POST/... /api/echo` | 回显 method/path/query/headers/body(exp 默认)/UA，JSON + 可选 `?raw` 纯文本 |
| `/api/status/:code` | 返回指定状态码（校验合法区间，默认 200），正文即状态说明 |
| `/api/delay/:seconds` | 人为延迟响应（cap 上限，护住服务器） |
| `/api/redirect?to=&times=` | 多次跳转链（302），可演示重定向与 referer 行为 |
| `/api/cookies` | 写/读/清 cookie 的演示（Set-Cookie 属性实验：SameSite/Expires/…） |
| `/api/cache` | 固定 Cache-Control/ETag 语义的演示端点 |
| `/api/headers` | 构造任意响应头回显（白名单常用头，防任意注入） |
| `/api/ip`, `/api/ua` | 请求来源 IP / UA 简版 |

防护（v0 内建）：全端点只读语义；按 IP 令牌桶限频；`delay` 上限 10s；无 CORS 头（同域演示组件直接 fetch，天然限制他站脚本）；响应体大小上限。重操作（如更大延迟）留 token 解锁位。

文章内演示方式：MDX 节点渲染**客户端“试一下”组件**（表格展示 curl 命令 + 点击直接请求同域接口并展示响应），无需额外开启 CORS。

## 8. MCP 适配（唯一需动的现有服务）

- `mcp/lib/store.mjs` 的 URL 生成目前移植 `_config.yml` 的 `permalink: ':year/:month/:day/:title/'`——**改为固定 `/posts/:slug`**，并把站点 url 从 example.com 占位切到 `https://jianghong.site`（此前降级为相对路径的逻辑保留为兜底）
- `server.mjs`（stdio/HTTP/token/索引重建）不动
- 验收：`node mcp/test-smoke.mjs` 11 项断言全绿；`bin/mcp-install.mjs` dry-run 正常列出接入目标

## 9. 内容管线（保留层）

- `bin/sync-articles.mjs`：clone/pull `Leonw26/article` → 跳过 `private/` → 注入兜底 front-matter → Obsidian 图片语法转换 → **输出目录改为新内容目录**（layout 见施工时决定，如 `content/posts/`）
- 图片同步到新 public/images 目录，绝对路径策略不变
- front-matter 解析统一 gray-matter；日期解析规则沿用（ISO / YAML date）

## 10. 部署与运行

- `npm run build` → `next start`（standalone），**launchd** plist 托管常驻 Node 进程（macOS；监听 `127.0.0.1:3000` 类本地端口，端口号与 plist 细节由 builder 定）
- nginx（Homebrew，`127.0.0.1:18100` 监听不变）：`location /` 由静态根改为 `proxy_pass` 到 Node；可选补 location 让 `/_next/static`、`/images` 继续直出（以现网目录结构为准，不强制）；cloudflared 与 TLS 边缘零变动
- MCP：独立 launchd 进程（stdio 由各客户端拉起，HTTP 模式常驻 + token）
- 构建入口：本机执行同步脚本 → `next build` → 重载服务；无 CI（`.github/` 仅 dependabot），本次不新设

## 11. 验收清单

1. §2.1 功能表逐项可演示（首页/首屏动效/归档/标签/关于/详情/进度条/暗色/404）
2. `next build` 本地零错误；构建产物含全量文章 HTML（SSG 状态核验 = 不触发请求时渲染）
3. 实验接口 v0 端点集可用 + 限频生效 + token 门在位
4. 打字机：正常路径（API 命中）/ 回退路径（断网/超时）双分支可测
5. 暗色切换无闪白（class 注入先于首帧不可见淡出——通过 pre-hydration script）
6. MCP 冒烟 11 项全绿；新 URL 生成正确（抽 3 篇 slug 中文编码抽查）
7. 同步链路：私有目录坚持不出现在任何产物（MCP 索引/构建产物/搜索）

## 12. 留给 builder 的决定

- 页面/组件目录结构与文件拆分（约定大于配置即可）
- 打字机组件的 hook 拆分与测试形态（可借鉴 `bin/test-first-screen.mjs` 思路）
- 实验接口各端点的具体实现细节与白名单清单
- nginx unit / systemd 文件的最终措辞
- TOC、分页、pill 的新视觉具体落法（对齐 DNA token，允许偏离 keep 现状）
- 字体最终栈的取舍确认

## 13. 风险与回退

- **迁移期间站点可用性**：Hexo 现网产物目录（`/opt/homebrew/etc/nginx/html/blog/`）原地保留；切换 day = 把 nginx `location /` 从静态目录切到代理 Node；回退 = location 指回静态目录，边缘（cloudflared）与域名层零变动
- **一言 API**：已有超时回退语义，重设计保留同样的 4s 超时 + 静态文案兜底
- **中文 slug 与邮件/分享场景**：URL-encoded 可读性略降，SEO 无碍；用户若在意可后续改拼音/短 ID（是 slug 策略的独立小改动，不影响架构）
- **实验接口滥用**：限频 + 只读 + 同域即可覆盖 v0；出现成本异常再加 token 门
