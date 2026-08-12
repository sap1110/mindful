import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base = cn(
  'inline-flex select-none items-center justify-center gap-2 rounded-pill',
  'font-medium leading-none tracking-[0.005em]',
  'transition-[background-color,color,border-color,box-shadow,transform] duration-250 ease-calm',
  'active:translate-y-px',
  'disabled:pointer-events-none disabled:opacity-45',
  // One focus treatment app-wide; offset keeps it clear of the pill edge.
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
)

const variants: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-primary text-primary-fg shadow-soft',
    'hover:bg-primary-hover hover:shadow-lift',
  ),
  secondary: cn(
    'border border-border-strong bg-surface text-text shadow-soft',
    'hover:border-primary/40 hover:bg-primary-soft/60 hover:text-primary',
  ),
  ghost: cn('text-text-muted hover:bg-surface-muted hover:text-text'),
  quiet: cn(
    'text-primary underline decoration-primary/30 decoration-1 underline-offset-4',
    'hover:decoration-primary/70',
  ),
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-13 px-7 text-base',
}

/** Shared button appearance, reusable on `<Link>` and `<a>` as well as `<button>`. */
export function buttonStyles(options?: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}): string {
  const { variant = 'primary', size = 'md', fullWidth = false, className } = options ?? {}
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)
}
