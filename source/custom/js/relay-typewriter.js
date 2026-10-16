/**
 * 首屏金句「接力打字机」
 *
 * 模式（配置 _config.keep.yml -> first_screen）：
 *   - custom_hitokoto: true  —— 优先请求「一言」API（v1.hitokoto.cn）取随机句子打字；
 *     失败 / 超时（4s）回退到 description 渲染的本地文案
 *     （不用主题自带的 hitokoto: true —— 它固定等 400ms，API 慢于该窗口时动画丢失，
 *      且与自定义脚本存在双重驱动）
 *   - custom_hitokoto: false —— 直接对渲染文案打字（用 ｜| token 可拆多行接力）
 *
 * ⚠️ 全局对象约定：主题在 <head> 用 `const KEEP = window.KEEP || {}` 暴露配置，
 * 这是脚本级词法全局，挂不上 window —— 必须用裸标识符 KEEP 访问（主题源码 28 处皆如此），
 * window.KEEP 永远是 undefined。本脚本用 typeof 探测两者兼容。
 *
 * 时序关键点：inject 注入的脚本无 async/defer，body 末尾同步执行（早于 DOMContentLoaded）；
 * 先清空渲染文案，主题 home-page.js 在 DCL+300/400ms 的打字逻辑读到空内容自动 no-op
 * （只保留其透明度淡入），打字完全由本脚本接管。
 *
 * PJAX 注意：本站未启用 pjax。若日后启用，需在 pjax 切换后重新调用 startRelayTypewriter。
 */
const LINE_SPLIT_TOKEN = '｜|'
const TYPE_SPEED = 120 // ms，每敲一个字符的间隔

// 一言句库分类，可自行增删：a 动画 / b 漫画 / d 文学 / k 哲学 / i 诗词 / e 游戏
const HITOKOTO_CATEGORIES = ['a', 'b', 'd', 'k']
const HITOKOTO_URL = `https://v1.hitokoto.cn/?${HITOKOTO_CATEGORIES.map((c) => `c=${c}`).join('&')}`
const HITOKOTO_TIMEOUT = 4000 // ms
const WAIT_BEFORE_TYPING = 800 // ms，等过主题 300/400ms 打字窗口后再开始自己的动画，避免双重驱动

function getFirstScreenConfig() {
  // 裸 KEEP = 脚本级词法全局（主题约定）；window.KEEP 兜底（测试环境/未来主题变更）
  let themeConfig = null
  try {
    themeConfig = (typeof KEEP !== 'undefined' && KEEP) || window.KEEP || null
  } catch {
    themeConfig = null
  }
  return themeConfig?.theme_config?.first_screen || {}
}

function withTimeout(p, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

// 「一言」请求：成功 resolve 句子文本；网络失败/超时 reject
// （用 Promise.race 做超时而不是 AbortSignal，兼容各类环境，超时后底层请求自然被丢弃）
function fetchHitokoto() {
  return withTimeout(
    fetch(HITOKOTO_URL).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    }),
    HITOKOTO_TIMEOUT
  ).then((data) => {
    if (!data?.hitokoto) throw new Error('empty hitokoto')
    return data.hitokoto
  })
}

/**
 * 对单个 desc 打字
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
  const fsCfg = getFirstScreenConfig()
  if (fsCfg?.enable !== true) return

  const descBox = document.querySelector('.first-screen-content .description')
  if (!descBox) return

  descBox.querySelectorAll('.desc-item').forEach((item) => {
    const desc = item.querySelector('.desc')
    const cursor = item.querySelector('.cursor')
    if (!desc || desc.dataset.started) return // 防重复初始化
    desc.dataset.started = '1'

    const fallback = (desc.textContent || '').trim()

    // 主题的打字时窗为 DCL+300/400ms，统一等过窗口再开始自己的动画，
    // 让主题时刻读到空文案 no-op，任何分支都不会与主题双重驱动
    const gate = new Promise((r) => setTimeout(r, WAIT_BEFORE_TYPING))

    if (fsCfg?.custom_hitokoto === true) {
      // 「一言」模式：先清空此次渲染的本地文案，请求一句话来打字；失败回退本地文案
      desc.textContent = ''
      if (cursor) cursor.style.display = 'inline'
      if (cursor) cursor.style.opacity = '0.4' // 等待返回期间光标弱化
      Promise.allSettled([fetchHitokoto(), gate]).then(([hitokoto]) => {
        if (cursor) cursor.style.opacity = '1'
        if (hitokoto.status === 'fulfilled') {
          relayTypewriter(desc, cursor, splitRelayLines(hitokoto.value))
        } else {
          console.warn('[relay-typewriter] hitokoto failed, fallback to local quote:', hitokoto.reason?.message)
          relayTypewriter(desc, cursor, splitRelayLines(fallback))
        }
      })
      return
    }

    if (cursor) cursor.style.display = 'inline'
    gate.then(() => relayTypewriter(desc, cursor, splitRelayLines(fallback)))
  })
}

document.addEventListener('DOMContentLoaded', startRelayTypewriter)
