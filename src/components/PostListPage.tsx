import { getAllPosts, paginate } from '@/lib/posts'
import { PostCard } from './PostCard'
import { Pagination } from './Pagination'

/** 首页（/）与 /page/:n 共用的列表页实现；URL 合法性由路由层判断 */
export function PostListPage({ page }: { page: number }) {
  const { posts, pages, total, page: current } = paginate(getAllPosts(), page)
  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4">
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} />
      ))}
      <Pagination page={current} pages={pages} total={total} />
    </div>
  )
}
