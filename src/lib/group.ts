import type { Post } from './posts'

/** 归档分组：按年份聚合（输入已按 date 降序），输出年份降序 */
export function groupByYear(posts: Post[]): { year: string; posts: Post[] }[] {
  const map = new Map<string, Post[]>()
  for (const p of posts) {
    const year = p.date.slice(0, 4)
    const bucket = map.get(year)
    if (bucket) bucket.push(p)
    else map.set(year, [p])
  }
  return [...map.entries()]
    .map(([year, ps]) => ({ year, posts: ps }))
    .sort((a, b) => (a.year < b.year ? 1 : a.year > b.year ? -1 : 0))
}
