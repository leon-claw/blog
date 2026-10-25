# AGENTS.md — 项目记忆

## 工作规则（最高优先级）

- **不要自动 commit**：除非用户主动明确要求（例如"commit"、"提交一下"），否则只做文件修改，不执行 `git commit`，也不 `git push`

## 博客 MCP 接口

- 博客提供了一套 MCP 服务（`mcp/server.mjs`，官方 SDK，stdio + `--http` Streamable HTTP 双模式），供 Agent 检索博客全文
- HTTP 模式可部署远程：`--host 0.0.0.0 --token <TOKEN> --refresh <秒>`（token 鉴权 + 定时重建索引）；部署指南在 `mcp/README.md`（VPS/systemd 或 Docker，镜像配置 `Dockerfile.mcp`）
- 工具：`search_posts` / `list_posts` / `get_post` / `list_tags` / `get_site_info`；资源：`blog://posts/{slug}`、`blog://site`
- 数据源为 `content/posts/*.md`（`npm run sync-articles` 自 `article-src/` 同步）；`article-src/private/` 私密草稿在同步阶段就被排除，任何相关改动必须保持这一性质
- 变更文章索引相关逻辑后跑冒烟测试：`node mcp/test-smoke.mjs`（11 项断言）
- Agent "一键接入"用 `node bin/mcp-install.mjs`（默认 dry-run，加 `--yes` 才写入，会自动备份目标配置）
- 文档：`mcp/README.md`；文章链接统一为 `/posts/:slug`（站点根 URL 常量在 `mcp/lib/store.mjs`），仍是 example.com 占位符时会降级为站内相对路径
