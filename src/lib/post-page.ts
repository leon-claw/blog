import { getAllPosts } from './posts'

/** 详情页 generateStaticParams 的产物（键用 percent-encoded 形态对照匹配） */
export function postStaticParams(): { slug: string }[] {
  return getAllPosts().map((p) => ({ slug: encodeURIComponent(p.slug) }))
}

/**
 * 解码动态段参数：Next 对含空格的预渲染键会额外 encode 一层（%20 → %2520，实测 15.5.28），
 * 纯中文段只 encode 一层。安全双 decode + 收敛短路 + 抛错保护（slug 原文已无 percent 时幂等）。
 */
export function decodeParamSlug(raw: string): string {
  let out = raw
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(out)
      if (next === out) break
      out = next
    } catch {
      break
    }
  }
  return out
}

/** meta description：正文纯文本前 120 字（代码块剔除、空白折叠） */
export function excerpt(md: string, max = 120): string {
  const text = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/!\[\[.*?\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[#>*`~\[\]()-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}
