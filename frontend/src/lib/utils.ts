import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
]

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago"… */
export function timeAgo(iso: string, now: number = Date.now()): string {
  let duration = (new Date(iso).getTime() - now) / 1000
  if (Math.abs(duration) < 45) return 'just now'
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return ''
}

export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** 999 → "999", 1200 → "1.2K", 3_400_000 → "3.4M" */
export function formatCount(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${trimZero(value / 1000)}K`
  return `${trimZero(value / 1_000_000)}M`
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/** Deterministic gradient per user so initials avatars stay stable. */
const GRADIENTS = [
  'from-indigo-500 to-purple-500',
  'from-sky-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-orange-400',
  'from-violet-500 to-fuchsia-500',
  'from-amber-500 to-yellow-400',
  'from-blue-600 to-indigo-400',
] as const

export function gradientFor(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]!
}

/** Strip the scheme and trailing slash for display: https://example.com/ → example.com */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/** Copy text to the clipboard, falling back to a hidden textarea on insecure origins. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
