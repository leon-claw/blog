/**
 * 首屏金句「打字机」
 *
 * 模式（配置 _config.keep.yml -> first_screen）：
 *   - custom_hitokoto: true  —— 优先请求「一言」API 取随机句子打字；
 *     请求失败 / 超时（4s）回退到 description 里渲染的本地文案
 *     （不用主题自带的 hitokoto: true —— 它有 400ms 竞态：API 慢于
 *     主题的固定等待时不会触发打字动画；且与自定义脚本双重驱动冲突）
 *   - custom_hitokoto: false —— 直接对渲染文案打字（可多行接力）
 *
 * 时序关键点：注入脚本无 async/defer，在 DOMContentLoaded 前同步执行；
 * 清空渲染文案后，主题 home-page.js 的打字逻辑（300/400ms 时刻）读到
 * 空内容自动 no-op，只保留其 opacity 淡入，打字完全由本脚本接管。
 *
 * 结构说明：
 *   .desc-item 内部是 .desc + .cursor（blink 动画来自主题本身）
 */
const LINE_SPLIT_TOKEN = '｜|'
const TYPE_SPEED = 120 // ms，每敲一个字符的间隔

// 一言句库分类，可自行增删：a 动画 / b 漫画 / d 文学 / k 哲学 / i 诗词 / e 游戏
const HITOKOTO_CATEGORIES = ['a', 'b', 'd', 'k']
const HITOKOTO_URL = `https://v1.hitokoto.cn/?${HITOKOTO_CATEGORIES.map((c) => `c=${c}`).join('&')}`
const HITOKOTO_TIMEOUT = 4000 // ms

function fetchHitokoto() {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), HITOKOTO_TIMEOUT)
  return fetch(HITOKOTO_URL, { signal: ctrl.signal })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    .then((data) => {
      if (timer) clearTimeout(timer)
      if (!data?.hitokoto) throw new Error('empty hitokoto')
      return data.hitokoto
    })
    .catch((e) => {
      clearTimeout(timer)
      throw e
    })
}

/**
 * 对单个 desc-item 打字
 * @param lineList 已拆好的行；仅一行时打完光标隐藏（同官方 demo），多行时循环接力
 */
function relayTypewriter(desc, cursor, lineList) {
  if (!desc || !lineList.length) return
  let lineIndex = 0

  function typeLine() {
    const text = lineList[lineIndex]
    desc.textContent = ''
    let i = 0

    function step() {
      if (i < text.length) {
        desc.textContent += text.charAt(i++)
        setTimeout(step, TYPE_SPEED)
      } else {
        // 打完本行：仅一行时打完即停；多行时停留片刻再清屏接力
        setTimeout(() => {
          if (cursor) cursor.style.display = 'none'
          if (lineList.length > 1) {
            setTimeout(() => {
              lineIndex = (lineIndex + 1) % lineList.length
              if (cursor) cursor.style.display = 'inline'
              typeLine()
            }, 350)
          }
        }, lineList.length > 1 ? 2000 : 220)
      }
    }

    step()
  }

  typeLine()
}

function splitRelayLines(raw) {
  if (!raw) return []
  return raw
    .split(LINE_SPLIT_TOKEN)
    .map((s) => s.trim())
    .filter(Boolean)
}

function startRelayTypewriter() {
  const fsCfg = window.KEEP?.theme_config?.first_screen
  if (fsCfg?.enable !== true) return

  const descBox = document.querySelector('.first-screen-content .description')
  if (!descBox) return

  descBox.querySelectorAll('.desc-item').forEach((item) => {
    const desc = item.querySelector('.desc')
    const cursor = item.querySelector('.cursor')
    if (!desc || desc.dataset.started) return // 防重复初始化（PJAX 复用）
    desc.dataset.started = '1'

    const fallback = desc.innerText.trim()

    if (fsCfg?.custom_hitokoto === true && !desc.classList.contains('hitokoto')) {
      // 混合模式：渲染文案先藏起来，换成「一言」结果；失败回退本地文案
      desc.textContent = ''
      if (cursor) cursor.style.display = 'inline'
      if (cursor) cursor.style.opacity = '0.4' // 等待期光标弱化提示"迟留输入"感
      fetchHitokoto()
        .then((line) => {
          if (cursor) cursor.style.opacity = '1'
          relayTypewriter(desc, cursor, [line])
        })
        .catch(() => {
          if (cursor) cursor.style.opacity = '1'
          relayTypewriter(desc, cursor, splitRelayLines(fallback))
        })
    } else {
      if (cursor) cursor.style.display = 'inline'
      relayTypewriter(desc, cursor, splitRelayLines(fallback))
    }
  })
}

// 复用主题提供的 register 机制（兼容 PJAX 页面切换）
const registerFn = window.KEEP?.register
if (registerFn) {
  registerFn({ path: '/', fn: startRelayTypewriter })
} else {
  document.addEventListener('DOMContentLoaded', startRelayTypewriter)
}
