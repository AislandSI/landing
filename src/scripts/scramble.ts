const GLYPHS = '▚▞▖▗▘▝░▒▓01/<>'
const tokens = new WeakMap<HTMLElement, number>()

/** Reveals text left to right through noise glyphs. A newer call on the same element cancels the previous one. */
export function scramble(el: HTMLElement, text: string, duration = 700) {
  const token = (tokens.get(el) ?? 0) + 1
  tokens.set(el, token)
  const start = performance.now()
  const step = (now: number) => {
    if (tokens.get(el) !== token) return
    const progress = Math.min(1, Math.max(0, (now - start) / duration))
    const revealed = Math.floor(progress * text.length)
    let out = text.slice(0, revealed)
    for (let i = revealed; i < text.length; i++) {
      out += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    }
    el.textContent = out
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
