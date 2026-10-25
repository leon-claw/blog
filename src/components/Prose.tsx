/** 文章排版容器：结构 HTML 由构建期 markdown 管线产出，这里只负责样式作用域 */
export function Prose({ html }: { html: string }) {
  return <div className="prose mt-6" dangerouslySetInnerHTML={{ __html: html }} />
}
