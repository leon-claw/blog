import { notFound } from 'next/navigation'
import { getAllPosts, paginate } from '@/lib/posts'
import { PostListPage } from '@/components/PostListPage'

/** SSG 只生成第 2..N 页（首页由 / 承担；/page/1 不存在） */
export const dynamicParams = false

export function generateStaticParams() {
  const { pages } = paginate(getAllPosts(), 1)
  return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ page: String(i + 2) }))
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  return { title: `第 ${page} 页` }
}

export default async function PageByNumber({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  const n = Number(page)
  if (!Number.isInteger(n) || n < 2) notFound()
  return <PostListPage page={n} />
}
