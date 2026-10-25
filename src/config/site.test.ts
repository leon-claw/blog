import { describe, expect, it } from 'vitest'
import { SITE } from './site'

describe('SITE 站点常量（spec §Global Constraints）', () => {
  it('url 为正式域名', () => {
    expect(SITE.url).toBe('https://jianghong.site')
  })

  it('标题与作者', () => {
    expect(SITE.title).toBe("Leon's Blog")
    expect(SITE.author).toBe('Leon')
  })

  it('首屏引言全文（DNA 逐字，含「人迹更少」）', () => {
    expect(SITE.description).toContain('人迹更少')
    expect(SITE.description).toContain('黄色的森林里分出两条路')
  })

  it('语言与时区', () => {
    expect(SITE.language).toBe('zh-CN')
    expect(SITE.timezone).toBe('Asia/Shanghai')
  })
})
