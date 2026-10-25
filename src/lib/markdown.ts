import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
import type { ShikiTransformer } from 'shiki'
import type { Root, RootContent } from 'mdast'
import { toString } from 'hast-util-to-string'
import slugger from 'github-slugger'

/**
 * Markdown 渲染管线（spec §7）：
 * remark → rehype（slug 锚点 + shiki 双主题高亮）→ html 字符串。
 * 高亮主题映射（按 design-dna 相关近似）：light=github-light、dark=github-dark-dimmed，
 * 颜色以 --shiki-light / --shiki-dark CSS 变量内联，切主题不改 HTML。
 */

export interface Heading {
  /** 详情页与 about 页只采集 h2/h3（h1 为文章标题本尊） */
  level: 2 | 3
  id: string
  text: string
}

/** 两件事：给 pre 补 data-language（供 TryIt/样式定位）；保护 fallback */
const langAttributeTransformer: ShikiTransformer = {
  name: 'lang-attribute',
  pre(node) {
    node.properties['data-language'] = this.options.lang
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeShiki, {
    themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    defaultColor: false,
    fallbackLanguage: 'plaintext',
    transformers: [langAttributeTransformer],
  })
  .use(rehypeStringify, { allowDangerousHtml: true })

export async function renderMarkdown(md: string): Promise<{ html: string; toc: Heading[] }> {
  const vfile = await processor.process(md)
  return { html: String(vfile), toc: extractToc(md) }
}

/** 按统一实现提取 h2/h3（id 用 github-slugger 与 rehype-slug 同算法，保证一致） */
function extractToc(md: string): Heading[] {
  const tree = unified().use(remarkParse).parse(md) as Root
  const toc: Heading[] = []
  const gs = new (slugger as unknown as { new (): { slug(v: string): string } })()
  const visit = (node: RootContent) => {
    if (node.type === 'heading') {
      if (node.depth === 2 || node.depth === 3) {
        const text = toString({ type: 'element', tagName: 'x', children: nodeToNodes(node) } as never)
        if (text.trim()) toc.push({ level: node.depth as 2 | 3, id: gs.slug(text), text })
      }
    }
    if ('children' in node && Array.isArray((node as { children?: RootContent[] }).children)) {
      for (const child of (node as { children: RootContent[] }).children) visit(child)
    }
  }
  for (const child of tree.children) visit(child)
  return toc
}

function nodeToNodes(node: { children?: RootContent[] }): RootContent[] {
  return node.children ?? []
}

/** 读取指标（spec §10）：剔除 fenced code、图片与 HTML 标签后计字符；400 字/分钟，下限 1 */
export function readingMetrics(md: string): { chars: number; minutes: number } {
  const stripped = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/!\[\[.*?\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<img[^>]*>/g, '')
    .replace(/<[^>]+>/g, '')
  // 计「文字量」：空白不参与（分钟数只随正文字符增长）
  const chars = stripped.replace(/\s+/g, '').length
  return { chars, minutes: Math.max(1, Math.ceil(chars / 400)) }
}
