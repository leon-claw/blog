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

    // 每行再按固定长度二次均分，形成多行「接力换行」的视觉效果
    const relay = raw
      .split(LINE_SPLIT_TOKEN)
      .map((s) => s.trim())
      .filter(Boolean)
      .reduce((lines, line) => {
        if (line.length <= 20) {
          lines.push(line)
        } else {
          const chunk = Math.max(12, Math.ceil(line.length / Math.ceil(line.length / 20)))
          for (let i = 0; i < line.length; i += chunk) lines.push(line.slice(i, i + chunk))
        }
        return lines
      }, [])

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
          // 本行打完：稍作停留后清屏，进入下一行接力
          setTimeout(() => {
            if (cursor) cursor.style.display = 'none'
            setTimeout(() => {
              lineIndex = (lineIndex + 1) % lines.length
              if (cursor) cursor.style.display = 'inline'
              typeLine()
            }, 350)
          }, 2000)
        }
      }

      step()
    }

    typeLine()
    // 防止循环打字链被打断：如果 5 秒内无变化则重启
    const guard = setInterval(() => {
      if (desc.textContent === '' && !desc.dataset.pending) {
        desc.dataset.pending = '1'
        typeLine()
        setTimeout(() => delete desc.dataset.pending, 1000)
      }
    }, 5000)
    item.dataset.guard = String(guard)
  }
}

// 首页脚本复用主题提供的 register 机制（兼容 PJAX 页面切换）
const registerFn = window.KEEP?.register
if (registerFn) {
  registerFn({ path: '/', fn: startRelayTypewriter })
} else {
  document.addEventListener('DOMContentLoaded', startRelayTypewriter)
}
