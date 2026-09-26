import { Link } from 'react-router'
import { cn } from '../../lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? 'size-8'} aria-hidden>
      <rect width="64" height="64" rx="14" className="fill-brand-600" />
      <path
        d="M20 22 L44 18 M20 22 L40 44 M44 18 L40 44"
        stroke="#a5b4fc"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="20" cy="22" r="6" fill="#fff" />
      <circle cx="44" cy="18" r="5" fill="#c7d2fe" />
      <circle cx="40" cy="44" r="7" fill="#fff" />
    </svg>
  )
}

export function Logo({ withText = true, className }: { withText?: boolean; className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Network — home"
      className={cn('flex items-center gap-2.5 rounded-lg', className)}
    >
      <LogoMark />
      {withText && (
        <span className="hidden text-xl font-extrabold tracking-tight sm:block">Network</span>
      )}
    </Link>
  )
}
