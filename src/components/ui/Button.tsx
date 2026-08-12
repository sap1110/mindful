import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  /** Decorative icon rendered before the label. Hidden from assistive tech. */
  iconLeft?: ReactNode
  /** Decorative icon rendered after the label. Hidden from assistive tech. */
  iconRight?: ReactNode
}

/**
 * The app's only button. Always renders a real `<button>` with an explicit
 * `type`, so it never accidentally submits a form it happens to sit inside.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, className, iconLeft, iconRight, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...rest}
    >
      {iconLeft ? (
        <span aria-hidden="true" className="-ml-0.5 inline-flex shrink-0">
          {iconLeft}
        </span>
      ) : null}
      {children}
      {iconRight ? (
        <span aria-hidden="true" className="-mr-0.5 inline-flex shrink-0">
          {iconRight}
        </span>
      ) : null}
    </button>
  )
})

export default Button
