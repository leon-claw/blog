import { FirstScreen } from '@/components/FirstScreen'
import { PostListPage } from '@/components/PostListPage'

/** 首页 = 首屏（Liquid cover + 打字机）+ 第 1 页文章 */
export default function HomePage() {
  return (
    <>
      <FirstScreen />
      <PostListPage page={1} />
    </>
  )
}
