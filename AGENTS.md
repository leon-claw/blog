# AGENTS.md — 项目记忆

## 工作规则（最高优先级）

- **不要自动 commit**：除非用户主动明确要求（例如"commit"、"提交一下"），否则只做文件修改，不执行 `git commit`，也不 `git push`

## 博客 MCP 接口

- 博客提供了一套 MCP 服务（`mcp/server.mjs`，官方 SDK，stdio + `--http` Streamable HTTP 双模式），供 Agent 检索博客全文
- HTTP 模式可部署远程：`--host 0.0.0.0 --token <TOKEN> --refresh <秒>`（token 鉴权 + 定时重建索引）；部署指南在 `mcp/README.md`（VPS/systemd 或 Docker，镜像配置 `Dockerfile.mcp`）
- 工具：`search_posts` / `list_posts` / `get_post` / `list_tags` / `get_site_info`；资源：`blog://posts/{slug}`、`blog://site`
- Agent "一键接入"用 `node bin/mcp-install.mjs`（默认 dry-run，加 `--yes` 才写入，会自动备份目标配置）；文档：`mcp/README.md`

## 博客内容管理

- **文章唯一数据源：`content/posts/*.md`**（本仓库直接管理、直接提交；Hexo 时代的外部仓库 Leonw26/article 已退役，`bin/sync-articles.mjs` 已删除，无同步步骤）
- **私密写作草稿：`drafts/private/*.md`**，目录被 `.gitignore` 排除（绝不入库、不进构建与 MCP 索引——不在 `content/posts` 目录下，天然排除）；草稿转为公开时手动移入 `content/posts/`
- Obsidian wiki 图片语法 `![[img.png]]`（含 `|宽度`）由渲染层转换（`src/lib/markdown.ts` `normalizeObsidianImages`），图片放 `public/images/articles/`
- 变更文章索引相关逻辑后跑冒烟测试：`node mcp/test-smoke.mjs`（11 项断言）
- 文章链接统一为 `/posts/:slug`（站点根 URL 常量在 `mcp/lib/store.mjs`）
