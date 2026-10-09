import { PRODUCT_NAME } from '../config/product'
import { copy, DEFAULT_LANG, type Copy, type Lang } from './copy'

const STORAGE_KEY = 'landing-lang'

let current: Lang = DEFAULT_LANG
const listeners = new Set<(copy: Copy) => void>()

export function lang(): Lang {
  return current
}

export function phrase(): Copy {
  return copy[current]
}

export function onLocale(listener: (copy: Copy) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function lookup(source: unknown, path: string): string {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined
    return (acc as Record<string, unknown>)[key]
  }, source)
  return typeof value === 'string' ? value : ''
}

function fillTitle(title: HTMLElement, lead: string, accent: string) {
  const leadWords = lead.split(' ')
  const accentWords = accent.split(' ')
  const word = (text: string, index: number, accented: boolean) => {
    const outer = document.createElement('span')
    outer.className = accented ? 'w w--accent' : 'w'
    outer.style.setProperty('--wi', String(index))
    const inner = document.createElement('span')
    inner.textContent = text
    outer.append(inner)
    return outer
  }
  const nodes: Node[] = leadWords.map((text, index) => word(text, index, false))
  nodes.push(document.createElement('br'))
  accentWords.forEach((text, index) => nodes.push(word(text, leadWords.length + index, true)))
  title.replaceChildren(...nodes)
}

export function applyLocale(next: Lang, persist = false) {
  const resolved: Lang = next === 'es' ? 'es' : DEFAULT_LANG
  if (resolved === current && document.documentElement.lang === resolved) return
  current = resolved
  const text = phrase()
  const root = document.documentElement
  root.lang = current

  document.title = `${PRODUCT_NAME} — ${text.metaTitle}`
  document.querySelector('meta[name="description"]')?.setAttribute('content', text.metaDescription)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', text.metaDescription)
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', text.locale)

  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const value = lookup(text, el.dataset.i18n ?? '')
    if (value) el.textContent = value
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-html]')) {
    const value = lookup(text, el.dataset.i18nHtml ?? '')
    if (value) el.innerHTML = value
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
    const value = lookup(text, el.dataset.i18nAria ?? '')
    if (value) el.setAttribute('aria-label', value)
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-cursor-key]')) {
    const key = el.dataset.cursorKey as keyof Copy['cursor']
    const value = text.cursor[key]
    if (value) el.dataset.cursorText = value
  }

  const slots = new Map<string, HTMLElement[]>()
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-slot]')) {
    const key = el.dataset.i18nSlot ?? ''
    const list = slots.get(key) ?? []
    list.push(el)
    slots.set(key, list)
  }
  for (const [key, els] of slots) {
    const words = (text as Record<string, unknown>)[key]
    if (!Array.isArray(words)) continue
    els.forEach((el, index) => {
      el.textContent = String(words[index % words.length])
    })
  }

  for (const title of document.querySelectorAll<HTMLElement>('[data-i18n-chapter]')) {
    const chapter = text.chapters[Number(title.dataset.i18nChapter)]
    if (chapter) fillTitle(title, chapter.lead, chapter.accent)
  }

  const eyesMode = document.querySelector<HTMLElement>('[data-eyes-state].is-active')?.dataset.eyesState
  const kicker = document.querySelector<HTMLElement>('[data-eyes-kicker]')
  if (kicker) kicker.textContent = eyesMode === 'found' ? text.eyesFound : text.eyesIdle

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    const pressed = button.dataset.lang === current
    button.setAttribute('aria-pressed', String(pressed))
    button.tabIndex = pressed ? -1 : 0
  }

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, current)
    } catch {
      /* private mode */
    }
  }

  for (const listener of listeners) listener(text)
}

export function initLocale() {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    stored = null
  }
  applyLocale(stored === 'es' || stored === 'en' ? stored : DEFAULT_LANG)

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    button.addEventListener('click', () => {
      const next = button.dataset.lang
      if (next === 'en' || next === 'es') applyLocale(next, true)
    })
  }
}
