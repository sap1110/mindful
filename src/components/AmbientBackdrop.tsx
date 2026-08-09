import { cn } from '../lib/cn'

export interface AmbientBackdropProps {
  /** `hero` is the fullest wash (landing); `calm` is the quieter in-app version. */
  intensity?: 'hero' | 'calm'
  className?: string
}

/**
 * The ambient background: three very soft colour fields that drift at a
 * breathing pace, over a faint grid. Entirely decorative — `aria-hidden`, and
 * every animation stops under `prefers-reduced-motion` (handled globally in
 * index.css), leaving the static wash intact.
 */
export function AmbientBackdrop({ intensity = 'calm', className }: AmbientBackdropProps) {
  const isHero = intensity === 'hero'

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
    >
      {/* Warm paper base */}
      <div className="absolute inset-0 bg-background" />

      {/* Colour fields — sage, lavender, mist. Never more than three. */}
      <div
        className={cn(
          'absolute -left-[18%] -top-[22%] h-[46rem] w-[46rem] rounded-full bg-sage-200 blur-3xl animate-drift',
          isHero ? 'opacity-45' : 'opacity-25',
        )}
      />
      <div
        className={cn(
          'absolute -right-[16%] top-[6%] h-[38rem] w-[38rem] rounded-full bg-lavender-200 blur-3xl animate-drift [animation-delay:-9s]',
          isHero ? 'opacity-40' : 'opacity-20',
        )}
      />
      <div
        className={cn(
          'absolute -bottom-[26%] left-[24%] h-[42rem] w-[42rem] rounded-full bg-mist-200 blur-3xl animate-drift [animation-delay:-17s]',
          isHero ? 'opacity-40' : 'opacity-20',
        )}
      />

      {/* Hairline grid, barely perceptible — gives the wash something to sit on. */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(var(--c-border) / 0.55) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgb(var(--c-border) / 0.55) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(70% 60% at 50% 40%, black, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 40%, black, transparent 100%)',
        }}
      />

      {/* Bottom vignette so foreground text always lands on a settled tone. */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}

export default AmbientBackdrop
