---
title: Streamable HTTP 与 SSE 与 Websocket
date: 2026-04-11 00:00:00
tags: [MCP, SSE, Streamable-HTTP, 中译]
原标题: SSE vs. Streamable HTTP in MCP
作者: Mostafa Sobh (@mostafasobh33)
来源: https://medium.com/@mostafasobh33/sse-vs-streamable-http-in-mcp-a88f0fec6ba9
---

# MCP 中的 SSE 与 Streamable HTTP

> **究竟改变了什么、什么保持不变，以及为什么这很重要。**

## HTTP+SSE 是如何工作的

原有的 MCP 远程传输使用两个端点：一个用来发送，一个用来接收。

- **GET /sse** —— 客户端只打开一次这条连接，并在整个会话期间保持它开启。服务器需要发回的所有内容——工具调用结果、进度更新、任何服务器端通知——都通过这条始终开启的管道传输。
- **POST /sse/messages** —— 客户端用它来发送请求：调用工具、列出资源，等等。服务器会立即返回一个空包体的 `202 Accepted`，而真正的响应稍后通过上面那条已打开的 GET 通道送达。

![[mcp-sse-architecture.png]]

于是 GET 通道承担了一切：流式传输工具调用进度、交付最终结果、承载服务器端的通知——全部都走这一条管道。

问题在于这条 GET 通道是**强制性的**。不保持它打开，你根本无法使用 MCP。而浏览器用来建立 SSE 连接的 `EventSource` API 不支持自定义请求头，所以认证 token 除了塞进 URL 之外别无去处：

```
GET /sse?token=eyJhbGci…   ← 出现在每一条服务器日志、代理日志和浏览器历史记录里
```

这是一个真实存在的安全问题，且它波及每一个 MCP 连接——因为 GET 通道从来都不是可选的，它是其他一切赖以存在的地基。

## Streamable HTTP 是如何工作的

Streamable HTTP 做了一个结构性改变：**POST 响应本身就可以流式传输。**

POST 不再只是回一句"已接收"、然后把所有内容都路由到常开的 GET 通道，而是由服务器保持 POST 响应体的打开状态，把进度事件和最终结果直接写入其中。工具调用与它的完整响应就此运行在同一条连接上。

![[mcp-streamable-http-architecture.png]]

GET 通道在 Streamable HTTP 中仍然存在，但如今它是**可选的**了。大多数简单的工具调用完全用不到它。而当它被用到时，其用途也截然不同——这就引出了一个重要的问题。

## “GET 通道不就是和之前一样的问题吗？”

看着 Streamable HTTP 里仍然存在的 GET 通道，问出这样的问题很合理：这不就是老 SSE 那条永远开着的连接吗？难道它没有同样的安全隐患？

其实有两个实打实的区别：

1. **首先——它是可选项，而不是必需品。** 在旧传输中，没有 GET 通道你就用不了 MCP；而在 Streamable HTTP 中，多数服务器根本不会打开它。一个 CI 集成可能需要它，一个简单的工具服务器则不需要。旧 GET 是承重墙，新 GET 只是一间备用房。
2. **其次，它有了正确的认证方式。** 旧 GET 是用浏览器的 `EventSource` API 打开的，该 API 不支持自定义请求头，逼得 token 只能进 URL。新 GET 则是由 MCP 客户端（而非浏览器 API）发起的普通 HTTP 请求，因此会话 ID 可以放进请求头而不是 URL：

```
GET /mcp
Mcp-Session-Id: f4c2a8e1-3b9d…   ← 放在请求头里，而不是 URL
```

## 把 CI 结果推送到 Claude Code

GET 通道的职责很窄：**在没有打开的 POST 时，把服务器端的内容送达客户端。**

一个具体的现实案例：Claude Code 支持 MCP 服务器把 CI 结果、监控告警或其他外部事件直接推送进你的会话，让 Claude 自动做出反应——你不需要粘贴任何东西。

场景是这样的：你让 Claude 实现一个功能。工具调用完成，代码写好，POST 连接随即关闭。你转身去做别的事。二十分钟后，CI 跑完了测试。此时已经没有打开的 POST 了，服务器唯一能触达客户端的途径，就是会话开始时打开的那条 GET 通道。

![[mcp-ci-push.png]]

> 旧 GET 通道 —— 强制，承载一切（工具结果 + 通知），通过 URL 认证。
> 新 GET 通道 —— 可选，仅在没有 POST 打开时承载服务器的主动推送，通过请求头认证。

总而言之：这次转变与其说是加入新功能，不如说是一场**架构修复**。Streamable HTTP 让响应随其请求同行，让常开通道从"必须"变为"可选"，并消除了认证上的被迫妥协。

---

*原文：[SSE vs. Streamable HTTP in MCP](https://medium.com/@mostafasobh33/sse-vs-streamable-http-in-mcp-a88f0fec6ba9)，作者 Mostafa Sobh（@mostafasobh33），2026-04-11 发布于 Medium。本文为中文译文，仅翻译原文正文（含全部插图），未包含原文页面的回复与推荐内容。*
