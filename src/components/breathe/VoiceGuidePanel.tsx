import { Volume2 } from 'lucide-react'
import { useId } from 'react'
import type { VoiceGuide } from '../../hooks/useVoiceGuide'
import { previewCue } from '../../lib/breathCues'
import { cn } from '../../lib/cn'
import { Chip } from '../ui/Chip'

export interface VoiceGuidePanelProps {
  guide: VoiceGuide
  /** Locked mid-session — changing the voice under someone would be unkind. */
  disabled: boolean
  className?: string
}

/**
 * Choosing the voice, before it says anything.
 *
 * Two switches and a list. The eyes-closed switch depends on the voice one and
 * says so rather than sitting there mysteriously greyed out, because a dimmed
 * screen with no voice is not a feature, it is a black rectangle.
 *
 * The "hear this voice" button matters more than it looks: voices vary wildly
 * between devices, and being made to start a three-minute session to find out
 * that this one sounds like a lift announcement is a poor way to relax.
 */
export function VoiceGuidePanel({ guide, disabled, className }: VoiceGuidePanelProps) {
  const selectId = useId()
  const { prefs, voices, available, speechSupported } = guide

  return (
    <fieldset className={cn('border-0 p-0', className)} disabled={disabled}>
      <legend className="mb-3 text-sm font-medium text-text">Voice</legend>

      {available ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Chip
              selectionMode="multi"
              name="voice-enabled"
              label="Guide me by voice"
              checked={prefs.enabled}
              onChange={(event) => guide.setEnabled(event.target.checked)}
            />
            <Chip
              selectionMode="multi"
              name="voice-eyes-closed"
              label="Eyes closed"
              checked={prefs.eyesClosed}
              disabled={disabled || !prefs.enabled}
              onChange={(event) => guide.setEyesClosed(event.target.checked)}
            />
          </div>

          <p className="mt-2.5 text-sm text-text-muted">
            {prefs.enabled
              ? prefs.eyesClosed
                ? 'The screen dims and the voice leads the whole session. Close your eyes — tap anywhere to pause.'
                : 'Each step is spoken aloud, so you can close your eyes and listen instead of watching.'
              : 'A spoken guide, using a voice already installed on this device. Turn it on to breathe with your eyes closed.'}
          </p>

          {prefs.enabled ? (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[14rem] flex-1">
                <label htmlFor={selectId} className="mb-2 block text-sm font-medium text-text">
                  Which voice
                </label>
                <select
                  id={selectId}
                  value={prefs.voiceId ?? voices[0]?.id ?? ''}
                  onChange={(event) => guide.setVoiceId(event.target.value)}
                  className={cn(
                    'w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base text-text',
                    'shadow-inset transition-[border-color,box-shadow] duration-250 ease-calm',
                    'hover:border-border-strong focus:outline-none',
                    'focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_rgb(var(--c-ring)/0.22)]',
                    'disabled:opacity-45',
                  )}
                >
                  {voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void guide.preview(previewCue())}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-pill border border-border',
                  'bg-surface px-4 py-2.5 text-sm font-medium text-text',
                  'shadow-soft transition-colors duration-250 ease-calm',
                  'hover:border-border-strong hover:bg-surface-muted',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                  'focus-visible:outline-ring disabled:opacity-45',
                )}
              >
                <Volume2 aria-hidden="true" className="h-4 w-4" />
                Hear this voice
              </button>
            </div>
          ) : null}

          <p className="mt-3 text-sm text-text-subtle">
            Only voices installed on this device are offered, so the guide works offline and no
            audio is generated anywhere but here.
          </p>
        </>
      ) : (
        <p className="text-sm text-text-muted">
          {speechSupported
            ? 'No on-device voice is installed in this browser, so the spoken guide is unavailable. Adding a system voice in your device settings will switch it on.'
            : 'This browser has no built-in speech, so the spoken guide is unavailable here. The circle and the written steps work exactly as before.'}
        </p>
      )}
    </fieldset>
  )
}

export default VoiceGuidePanel
