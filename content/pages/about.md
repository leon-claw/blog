---
title: 关于我
date: 2026-10-18 10:00:00
---

## 个人简介

😎 我是 Leon，一名前端工程师，也是全栈工程师，重度 AI 使用者，目前在香港城市大学数据科学专业攻读硕士。

⏳ 十年前端开发经验——从大三开始接触前端，至今一直以前端为主，顺带攒下了不少全栈的活儿。

🏢 待过的行业：脑机接口、互联网营销、金融。

🚀 在 AI 时代决定重回校园转型，积极转向 AI 方向，现在深耕 Agent 开发、AI+开发。

🧰 技术栈：TypeScript、CSS、React、Vue、Node.js、Next.js、Webpack、微信小程序、Redis、MongoDB、Monorepo、Rust.

🤖 Agent 技术栈：Python、PyTorch、sklearn、Pi-Agent、LangGraph.

📖 最初写博客，是想把踩过的坑、重点难点，还有沉下心来学过的东西沉淀下来。

💤 中间停更了很长时间——AI 就像一个万能的博客，一度想就此弃更。

🔄 最近 Agent 的发展让我意识到：在线博客也可以是知识库，所以重拾博客。

## 如何让你的 Agent 了解我

🛰 本站对外提供 MCP 服务：`https://jianghong.site/mcp`（Streamable HTTP），主流 Agent 客户端均可直接添加。

🧰 接入后能做的事：全文检索（`search_posts`）、按时间列文章（`list_posts`）、读单篇全文或摘要（`get_post`）、查全部标签（`list_tags`）、取站点概览（`get_site_info`）。

📋 把下面这段 Prompt 复制给你的 Agent，它就会自己接入并了解我：

```text
请帮我新增连接一个 MCP 服务（Streamable HTTP）：

- 名称：leon-blog
- 端点：https://jianghong.site/mcp

接入成功后，请依次执行：
1. 调用 get_site_info，了解站点基本情况；
2. 用 search_posts 检索「Agent」「Rust」「Next.js」等我关注的方向，
   挑 2~3 篇近期文章，用 get_post 读取全文；
3. 结合读到的内容，总结我是谁、技术背景和当前方向，
   作为你以后对话中关于我的背景知识。

如果你的环境不支持动态添加 MCP 连接，请直接告诉我添加它的具体步骤。
```

🎉 欢迎各位朋友们，干杯。
