import { describe, expect, it } from 'vitest'
import { groupByYear } from './group'
import type { Post } from './posts'

const makePost = (slug: string, date: string): Post => ({
  slug,
  title: slug,
  date,
  updated: date,
  tags: [],
  content: '',
})

describe('groupByYear（归档页分组）', () => {
  it('年份降序分组、组内保持输入顺序与数量', () => {
    const posts = [
      makePost('a', '2023-06-01 10:00:00'),
      makePost('b', '2023-01-15 08:00:00'),
      makePost('c', '2022-12-31 23:00:00'),
      makePost('d', '2022-01-01 00:00:00'),
      makePost('e', '2021-05-05 12:00:00'),
    ]
    const groups = groupByYear(posts)
    expect(groups.map((g) => g.year)).toEqual(['2023', '2022', '2021'])
    expect(groups[0]!.posts.map((p) => p.slug)).toEqual(['a', 'b'])
    expect(groups[1]!.posts.map((p) => p.slug)).toEqual(['c', 'd'])
    expect(groups[2]!.posts.map((p) => p.slug)).toEqual(['e'])
  })

  it('空输入 → 空数组', () => {
    expect(groupByYear([])).toEqual([])
  })
})
