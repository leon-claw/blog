# Leon's Blog MCP Server

把博客本身变成一个 **MCP（Model Context Protocol）服务**，任何支持 MCP 的 AI Agent（Claude Desktop、Cursor、VS Code Copilot、Claude Code 等）都能一键接入后检索、阅读你的博客全文。

```
content/posts/*.md ──┬─► mcp/lib/app.mjs（共享装配：工具 schema + handlers + 索引）
(直接管理提交；drafts/ 私密草稿天然排除)  │
                     ├─► mcp/server.mjs（stdio / --http 独立进程）
                     │       ├─ claude-desktop ─┐
                     │       ├─ cursor ─────────┤ stdio
                     │       ├─ vscode ─────────┘
                     │       └─ claude-code
                     │       └─ --http ► http://host:8787/mcp（远程 Agent）
                     └─► src/app/mcp/route.ts（Next Route Handler，随主站进程常驻）
                             └─ https://jianghong.site/mcp（生产端点，nginx 无需单独路由）
```

## 提供的能力

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `search_posts` | Tool | 全文检索，多关键词 AND，中文按子串命中，标题/标签正文加权，返回摘要片段 |
| `list_posts` | Tool | 按时间倒序列出文章（标题/slug/日期/标签/URL/摘要），可按标签、分类过滤、分页 |
| `get_post` | Tool | 读取一篇文章的完整 Markdown（参数支持 slug 或中文标题） |
| `list_tags` | Tool | 全部标签及文章数 |
| `get_site_info` | Tool | 站点元信息（名称/作者/文章总数/时间跨度） |
| `blog://posts/{slug}` | Resource | 文章 Markdown 原文 |
| `blog://site` | Resource | 站点概览 JSON |

数据源是 `content/posts/*.md`（本仓库直接管理），**私密草稿放 `drafts/private/`（被 .gitignore 排除，不在 `content/posts` 目录下，天然不出现在 MCP/构建/发布里）**。草稿转公开时手动移入 `content/posts/`。

## 一键接入

```bash
# 预览将要写入哪些配置（不写入）
node bin/mcp-install.mjs

# 实际写入（原配置自动备份为 *.bak-mcp）：会自动注册到检测安装了的客户端
node bin/mcp-install.mjs --yes

# 只处理指定目标：claude-desktop | cursor | vscode | claude-code
node bin/mcp-install.mjs --yes --only claude-desktop,cursor

# 反悔/卸载
node bin/mcp-install.mjs --remove --yes
```

之后**重启对应客户端**即可。验证：对 Agent 说 *"用 leon-blog MCP 搜一下 rust 的文章"*。

## 手动接入（拷贝即用）

以下配置里的路径请替换为本仓库实际路径（`NODE_BIN` 用 `which node` 的结果，GUI 客户端没有 shell PATH，务必用绝对路径）。

### Claude Desktop（`claude_desktop_config.json`）

```json
{
  "mcpServers": {
    "leon-blog": {
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/blog/mcp/server.mjs"]
    }
  }
}
```

### Cursor（`~/.cursor/mcp.json`）

```json
{
  "mcpServers": {
    "leon-blog": {
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/blog/mcp/server.mjs"]
    }
  }
}
```

### VS Code（工作区 `.vscode/mcp.json`，已经随本博客写好）

```json
{
  "servers": {
    "leon-blog": {
      "type": "stdio",
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/blog/mcp/server.mjs"]
    }
  }
}
```

### Claude Code（CLI 直接注册到 user 域）

```bash
claude mcp add leon-blog -s user -- node /absolute/path/to/blog/mcp/server.mjs
```

## Agent 远程接入（生产端点）

> **给 AI Agent 使用者**：下面是一份自包含的接入说明，无需阅读本文件其他章节。把这段告诉你的 Agent，或直接复制配置即可。

### 端点

```text
https://jianghong.site/mcp
```

- 协议：MCP **Streamable HTTP**（无状态，JSON 响应），基于官方 `@modelcontextprotocol/sdk`
- 鉴权：当前未启用验证；接口只读
- 内容：`jianghong.site` 全部公开文章（中文技术博客，66 篇+），私密草稿不在数据集内

### 配置

将服务器 `leon-blog` 以 **HTTP 远程 MCP** 形态加入你的 MCP 客户端：

**Cursor（`~/.cursor/mcp.json`）**

```json
{
  "mcpServers": {
    "leon-blog": {
      "url": "https://jianghong.site/mcp"
    }
  }
}
```

**Claude Code**

```bash
claude mcp add --transport http leon-blog https://jianghong.site/mcp
```

**VS Code / 其他兼容客户端（`mcp.json`）**

```json
{
  "servers": {
    "leon-blog": {
      "type": "http",
      "url": "https://jianghong.site/mcp"
    }
  }
}
```

**Claude Desktop**：设置 → Connectors → 添加自定义连接器，URL 填 `https://jianghong.site/mcp`。

### 可用工具

调用上述配置重启后，Agent 可以使用以下 5 个工具：

| 工具 | 说明 |
| --- | --- |
| `search_posts` | 全文检索，参数 `query`（支持多关键词 AND、中文子串），可选 `limit` |
| `list_posts` | 列出文章元信息（标题/日期/标签/URL），可选 `tag` / `category` / `limit` / `offset` 分页 |
| `get_post` | 读取一篇完整 Markdown，参数 `slug`（也兼容中文标题） |
| `list_tags` | 所有标签与文章计数 |
| `get_site_info` | 站点名称/作者/URL/文章总数/时间跨度 |

另有 MCP 资源：`blog://posts/{slug}`（文章原文）与 `blog://site`（站点 JSON）。

### HTTP 裸调（Agent 自检用）

Agent 无需 MCP 客户端，直接发 HTTP 请求也可以。请求格式为 JSON-RPC 2.0，全部请求 `POST https://jianghong.site/mcp`，带 `Content-Type: application/json` 和 `Accept: application/json, text/event-stream` 两个 header。

**验证连通（`tools/list`）**：

```bash
curl -s https://jianghong.site/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

返回 5 个工具的 JSON 列表即成功。

**调用一次工具（示例 `get_site_info`）**：

```bash
curl -s https://jianghong.site/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_site_info","arguments":{}}}'
```

其余工具同理：把 `params.name` 换成 `search_posts` / `list_posts` / `get_post` / `list_tags`，`params.arguments` 填对应 schema（见上表）。例如搜索：

```bash
curl -s https://jianghong.site/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_posts","arguments":{"query":"rust","limit":5}}}'
```

**读取资源**：`POST` 同一端点，`method` 用 `resources/read`，`params.uri` 填文章或站点 URI（如 `blog://posts/git`、`blog://site`）。响应里每条 result 的 `content[].text` 就是工具/资源的产物文本；工具返回的 JSON 串可以直接 `JSON.parse` 后取用。

**改用本地 stdio**：不想走网络时，Agent（Claude Code / Cursor / VS Code 等）也可以直接 spawn `node /path/to/blog/mcp/server.mjs`（任何 git clone 本仓库的机器均可，需 `npm i @modelcontextprotocol/sdk`）。详见下文[手动接入](#手动接入拷贝即用)。

### 注意事项

- 本服务**只读**，不会对博客/站点造成写入；可放心让 Agent 自由检索
- 如果需要自定义 header（当前未启用鉴权，但服务端后续可能加 Bearer），Cursor/VS Code/Claude Code 都支持在 MCP HTTP 配置里写 `headers` 字段
- 部署了什么变更、文章何时更新，见本 README 后文 [远程部署](#远程部署让别处的-Agent-接入) 章节

### 生产端点实现：Next 进程内嵌（无需单独的 MCP 服务）

`https://jianghong.site/mcp` 由博客主站进程（Next.js）本身提供——[src/app/mcp/route.ts](../src/app/mcp/route.ts) 是一个 Route Handler，内部复用 `mcp/lib/app.mjs` 的共享装配 + 官方 SDK 的 `WebStandardStreamableHTTPServerTransport`（无状态、JSON 响应，与 `--http` 模式行为一致）。因此：

- **nginx 不需要为 `/mcp` 单独配置路由**，走现有 `location /` 反代即可
- 部署主站（`next build` → `node .next/standalone/server.js`）就自动带上 MCP 端点，无需再起一个 `mcp/server.mjs --http` 进程、也不占额外端口
- 每个请求独立建 transport + server（无状态模式不复用实例），工具数据与主站同源、部署即同步

`mcp/server.mjs`（stdio / `--http`）依然保留，用于本地调试、一键接入客户端与独立远程部署（见下文）。两种形态共享同一份索引与工具实现，行为一致。

## HTTP 模式（远程 Agent / Web 服务接入）

`node mcp/server.mjs --http` 后暴露标准 **Streamable HTTP** 端点（无状态，`enableJsonResponse`）：

```bash
node mcp/server.mjs --http                       # 默认 http://127.0.0.1:8787/mcp（本地调试）
node mcp/server.mjs --http --port 3000 --host 0.0.0.0
node mcp/server.mjs --http --refresh 600         # 每 600s 重建索引，新文章无需重启自动可见
node mcp/server.mjs --http --token xxxxx         # 要求 Authorization: Bearer xxxxx
```

curl 也可以裸测：

```bash
curl -s http://127.0.0.1:8787/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 远程部署：让别处的 Agent 接入

想把端点公开给远程 Agent（别人设备上的 Cursor / Claude Desktop / Claude Code 等），需要一台能常驻跑 Node 的机器。文章数据（`content/posts/`）已提交进 Git，**部署只是 clone + 安装 SDK + 起进程**，不需要 Hexo：

### 方案 A：VPS + systemd（推荐，最简）

```bash
# 服务器上（任意 Linux + Node ≥ 20）
git clone <你的博客仓库> /srv/blog && cd /srv/blog
npm install @modelcontextprotocol/sdk
node mcp/server.mjs --http --host 127.0.0.1 --refresh 600   # 先裸跑验证
```

用 systemd 托管，`/etc/systemd/system/leon-blog-mcp.service`：

```ini
[Unit]
Description=Leon's Blog MCP
After=network-online.target

[Service]
WorkingDirectory=/srv/blog
ExecStart=/usr/bin/node mcp/server.mjs --http --host 127.0.0.1 --refresh 600
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now leon-blog-mcp
```

公网暴露建议套一层 Caddy（自动 HTTPS，一行配置）：

```
mcp.你的域名.com {
    reverse_proxy 127.0.0.1:8787
}
```

文章更新：在服务器上 `cd /srv/blog && git pull` 即可（`--refresh` 会自动重建索引，无需重启服务）。

### 方案 B：Docker

```bash
docker build -f Dockerfile.mcp -t leon-blog-mcp .
docker run -d --name leon-blog-mcp -p 8787:8787 leon-blog-mcp \
  mcp/server.mjs --http --host 0.0.0.0 --token <YOUR_TOKEN>
```

镜像只含 `mcp/` + `content/posts/` + MCP SDK，几十 MB。文章更新需重建镜像或 `-v` 挂载 `content/posts`。

### 远程客户端配置

假设端点为 `https://mcp.你的域名.com/mcp`（设了 `--token` 就带上 Authorization header）：

**Cursor（`~/.cursor/mcp.json`）**

```json
{
  "mcpServers": {
    "leon-blog": {
      "url": "https://mcp.你的域名.com/mcp",
      "headers": { "Authorization": "Bearer <TOKEN>" }
    }
  }
}
```

**VS Code（用户级或工作区 `mcp.json`）**

```json
{
  "servers": {
    "leon-blog": {
      "type": "http",
      "url": "https://mcp.你的域名.com/mcp",
      "headers": { "Authorization": "Bearer <TOKEN>" }
    }
  }
}
```

**Claude Code**

```bash
claude mcp add --transport http leon-blog https://mcp.你的域名.com/mcp \
  --header "Authorization: Bearer <TOKEN>"
```

**Claude Desktop**：设置 → Connectors → 添加自定义连接器，填 URL。它对自定义 header 支持有限，不建议在这条路线上设 token（内容是公开文章，只读接口，风险可控）。

### 安全说明

- 端点只读，只暴露公开文章（私密草稿目录不在数据集里），所以不带 token 裸暴露的风险 ≈ 公开网页。
- 想限制调用者就加 `--token`，配合支持自定义 header 的客户端（Cursor / VS Code / Claude Code）。
- 运维做到了解需要公网 HTTPS（部分客户端强制 https），Caddy/Nginx 反代是最省事的做法。

## npm scripts

```bash
npm run mcp            # stdio 模式（调试用，或被客户端直接调起）
npm run mcp:http       # HTTP 模式
npm run mcp:install    # 一键接入（dry-run）
```

## 测试

```bash
node mcp/test-smoke.mjs     # stdio 全链路 11 项断言
```

## 已知说明

- 文章 URL 固定为 `/posts/:slug`（常量在 `mcp/lib/store.mjs`），文章数据源与站点 url 常量也维护在该文件；工具返回的 `url` 字段即线上完整外链。
- 文章全量索引纯本地读取，启动无网络依赖；全量索引随每次启动/刷新重建。
- 新文章更新后无需重启：MCP 服务每次启动时重新扫描；长驻的 HTTP 模式可用 `--refresh <秒>` 定时重建索引（或重启进程）。
