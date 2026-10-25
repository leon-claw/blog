# 迁移终验清单（§11）

逐条可跑；全部通过即迁移验收完成。

> **已裁决偏差（2026-10-25 执行时）**：`/posts/[slug]` 采用 `dynamicParams = true` + **percent-encoded generateStaticParams 键**。
> 缘由：Next 15.5.28 对非 ASCII 动态段的 prerender 键匹配有缺陷——`dynamicParams = false` 下中文 slug（请求为 percent-encoded 形态）一律落入 `NoFallbackError` → 404（ASCII slug 正常）。现为：SSG 预渲染 66 页照常；中文 slug 首发服务器渲染，随后进增量缓存（`x-nextjs-cache: HIT`），在单进程部署形态下语义等同 ISR。
> 键采用 encoded 形态可让「请求 URL ↔ 预渲染缓存键」同形态；页内 `decodeURIComponent` 还原后查询数据（`post-page.ts` / `[slug]/page.tsx` 已配套）。
> 升级 Next 后应复核此缺陷是否修复（修复后可改回 `false` 并还原 raw 键）。

```bash
# 1. 测试与类型门禁
npm test                            # 67+ 用例全绿
npm run build                       # tsc 通过 + 全路由 SSG 成功

# 2. 文章页数量（66 篇，含中文 slug）
find .next/server/app/posts -name '*.html' | wc -l          # = 66
find .next/server/app/posts -maxdepth 1 -type d | wc -l     # 含目录总数应 > 66

# 3. 静态页产物
ls .next/server/app/index.html .next/server/app/archives.html .next/server/app/about.html .next/server/app/tags.html 2>/dev/null || \
  ls .next/server/app | head -20                    # / /archives /about /tags 至少以一种形态存在

# 4. API 冒烟（next start 后）
npm run build && npm start &                        # 或 PORT=3999 npm start
curl -s http://127.0.0.1:3999/api/echo -X POST -d '{"ping":1}'   # 回显 body '{"ping":1}'
curl -si http://127.0.0.1:3999/api/delay/1 | head -1             # 200（1s）
curl -si http://127.0.0.1:3999/api/delay/11 | head -1            # 400
curl -si http://127.0.0.1:3999/api/redirect?times=2 | grep -i location
for i in $(seq 1 31); do curl -so /dev/null http://127.0.0.1:3999/api/ip; done  # 无再触限流统计（shell 连打 31 次 → 最后一次 429，同 IP）
curl -si http://127.0.0.1:3999/api/headers?x-demo-retry-after=5 | grep -i x-demo-retry-after
curl -sI http://127.0.0.1:3999/api/cache | grep -i etag

# 5. 打字机两分支（浏览器手测）
#    a. 首页访网正常 → hitokoto 一言打字（或断网 → fallback SITE.description）
#    b. prefers-reduced-motion → 静态全句

# 6. MCP 管线
node mcp/test-smoke.mjs                             # 11/11
node --input-type=module -e "import {loadStore,listPosts} from './mcp/lib/store.mjs';const s=loadStore();console.log(listPosts(s,{limit:1}).posts[0].url)"
                                                    # 形如 https://jianghong.site/posts/<slug>

# 7. git 状态
git status --short                                  # 仅本计划新增/修改/删除文件（提示：无自动 commit）
```
