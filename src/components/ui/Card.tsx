import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Render as a different element when the surrounding markup needs semantics. */
  as?: ElementType
  /** `raised` lifts off the page; `flat` sits within it; `sunken` recedes. */
  tone?: 'raised' | 'flat' | 'sunken'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children?: ReactNode
}

const tones = {
  raised: 'border-border bg-surface shadow-lift',
  flat: 'border-border bg-surface shadow-soft',
  sunken: 'border-border/70 bg-surface-muted shadow-none',
} as const

const paddings = {
  none: '',
  sm: 'p-5',
  md: 'p-6 sm:p-8',
  lg: 'p-7 sm:p-10',
} as const

/** The single raised-surface treatment used everywhere in the app. */
export function Card({
  as: Tag = 'div',
  tone = 'flat',
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag className={cn('rounded-3xl border', tones[tone], paddings[padding], className)} {...rest}>
      {children}
    </Tag>
  )
}

export default Card
