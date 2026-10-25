import { notFound } from 'next/navigation'
import { getAllTags, getPostsByTag } from '@/lib/posts'
import { PostCard } from '@/components/PostCard'

// 全量 SSG：中文标签原样传给 Next（解码由框架完成）
export const dynamicParams = false

export function generateStaticParams() {
  return getAllTags().map((t) => ({ tag: t.tag }))
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  return { title: `标签「${tag}」` }
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const posts = getPostsByTag(tag)
  if (posts.length === 0) notFound()
  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4">
      <h1 className="text-2xl font-semibold text-text-strong">
        标签「{tag}」 <span className="text-xs font-normal text-text-dim">({posts.length})</span>
      </h1>
      {posts.map((post) => <PostCard key={post.slug} post={post} />)}
    </div>
  )
}
