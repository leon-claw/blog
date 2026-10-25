/**
 * 站点常量——单一事实来源（替代 _config.yml），spec §3/§6。
 * description 是首屏打字机的本地回退文案（逐字沿用 keep 主题现状，见 design-dna.json）。
 */
export const SITE = {
  title: "Leon's Blog",
  author: 'Leon',
  url: 'https://jianghong.site',
  description:
    '黄色的森林里分出两条路，可惜我不能同时去涉足，而我选择了人迹更少的那一条，从此决定了我一生的道路。',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
} as const
