import { getAllPosts } from './posts'

/** 详情页 generateStaticParams 的产物（实验 B：key 用 percent-encoded 形态对照匹配） */
export function postStaticParams(): { slug: string }[] {
  return getAllPosts().map((p) => ({ slug: encodeURIComponent(p.slug) }))
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
