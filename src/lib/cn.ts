import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge needs to know about the custom scales in tailwind.config.js,
 * otherwise it treats e.g. `text-display-md` as a colour class and drops it.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            '2xs',
            'display-xs',
            'display-sm',
            'display-md',
            'display-lg',
            'display-xl',
          ],
        },
      ],
      shadow: [{ shadow: ['soft', 'lift', 'float', 'inset'] }],
      rounded: [{ rounded: ['pill'] }],
    },
  },
})

/** Conditional class names with conflicting Tailwind utilities resolved last-wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
