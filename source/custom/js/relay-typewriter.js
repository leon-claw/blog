/**
 * 首屏金句「接力打字机」效果
 *
 * Hexo 渲染时会把配置里的 `||` 转成换行 <br>，多个 `<br>` 会被压成空格；
 * 因此这里在运行时重新切分文本：先还原 `｜|` 分隔的多行，再逐「行」循环打字。
 * 所有行共享同一个闪烁光标：当前行打完 -> 清空 -> 下一行接力。
 *
 * 结构说明：
 *   .desc-item 内部是 .desc + .cursor（blink 动画来自主题本身）
 *   拆好的行存入 data-lines 备用，避免二次初始化
 */
const LINE_SPLIT_TOKEN = '｜|'
const TYPE_SPEED = 120 // ms，每敲一个字符的间隔

function startRelayTypewriter() {
  const fsEnabled = window.KEEP?.theme_config?.first_screen?.enable === true
  const hitokoto = window.KEEP?.theme_config?.first_screen?.hitokoto === true
  if (!fsEnabled && !hitokoto) return

  const descBox = document.querySelector('.first-screen-content .description')
  if (!descBox) return

  const descItems = descBox.querySelectorAll('.desc-item')
  descItems.forEach((item) => {
    const desc = item.querySelector('.desc')
    const cursor = item.querySelector('.cursor')
    if (!desc || desc.dataset.lines) return

    const raw = desc.innerText.trim()
    if (!raw) return

    // 按 \n 或行分割 token 拆行；单段则只有一行（单个打字机，打完即停）
    const relay = raw
      .split(LINE_SPLIT_TOKEN)
      .map((s) => s.trim())
      .filter(Boolean)

    // 标记已处理，防止重复初始化
    desc.dataset.lines = relay.join('\n')
    if (cursor) cursor.style.display = 'inline'
    relayTypewriter(item, cursor)
  })

  function relayTypewriter(item, cursor) {
    const desc = item.querySelector('.desc')
    const lines = desc?.dataset.lines?.split('\n') || []
    if (!desc || !lines.length) return

    let lineIndex = 0

    function typeLine() {
      const text = lines[lineIndex]
      desc.textContent = ''
      let i = 0

      function step() {
        if (i < text.length) {
          desc.textContent += text.charAt(i++)
          setTimeout(step, TYPE_SPEED)
        } else {
          // 打完本行：仅一行时打完即停（光标隐藏，同官方 demo）；
          // 多行时停留片刻再清屏，进入下一行接力
          setTimeout(() => {
            if (cursor) cursor.style.display = 'none'
            if (lines.length > 1) {
              setTimeout(() => {
                lineIndex = (lineIndex + 1) % lines.length
                if (cursor) cursor.style.display = 'inline'
                typeLine()
              }, 350)
            }
          }, lines.length > 1 ? 2000 : 220)
        }
      }

      step()
    }

    typeLine()
  }
}

// 首页脚本复用主题提供的 register 机制（兼容 PJAX 页面切换）
const registerFn = window.KEEP?.register
if (registerFn) {
  registerFn({ path: '/', fn: startRelayTypewriter })
} else {
  document.addEventListener('DOMContentLoaded', startRelayTypewriter)
}
