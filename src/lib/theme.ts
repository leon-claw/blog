/** 主题契约（DNA）：class 策略 + localStorage 显式落值；prefers-color-scheme 为未存储时的回退 */
export const THEME_STORAGE_KEY = 'theme'

/** pre-hydration 内联脚本：body 首插， согласно THEME_STORAGE_KEY 防首屏闪烁 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark-mode')}catch(e){}})()`
