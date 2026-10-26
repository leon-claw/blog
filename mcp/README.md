# Leon's Blog MCP Server

把博客本身变成一个 **MCP（Model Context Protocol）服务**，任何支持 MCP 的 AI Agent（Claude Desktop、Cursor、VS Code Copilot、Claude Code 等）都能一键接入后检索、阅读你的博客全文。

```
content/posts/*.md ──► mcp/server.mjs ──► MCP 客户端
(直接管理提交；drafts/ 私密草稿天然排除)  ├─ claude-desktop ─┐
                                        ├─ cursor ─────────┤ stdio
                                        ├─ vscode ─────────┘
                                        └─ claude-code
                                        └─ --http ► http://host:8787/mcp（远程 Agent）
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

想把端点公开给远程 Agent（别人设备上的 Cursor / Claude Desktop / Claude Code 等），需要一台能常驻跑 Node 的机器。文章数据（`source/_posts/`）已提交进 Git，**部署只是 clone + 安装 SDK + 起进程**，不需要 Hexo：

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

镜像只含 `mcp/` + `source/_posts/` + MCP SDK，几十 MB。文章更新需重建镜像或 `-v` 挂载 `source/_posts`。

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

- 文章 URL 由 `_config.yml` 的 `permalink`（`:year/:month/:day/:title/`）生成；**如果 `url` 还是 hexo 占位符 `example.com`，会自动降级为站内相对路径**（如 `/2023/05/14/xxx/`），配置真实域名后自动变成完整外链。
- 66 篇文章全量索引纯本地读取，启动无网络依赖。
- 新文章更新后无需重启：MCP 服务每次启动时重新扫描；长驻的 HTTP 模式重启进程即可（或交给 systemd/pm2 托管）。
