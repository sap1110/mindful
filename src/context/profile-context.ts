import { createContext } from 'react'
import type { Profile } from '../lib/profile'

export interface ProfileContextValue {
  /** The stored on-device profile, or null when onboarding has not been completed. */
  profile: Profile | null
  /** True until the first read of localStorage has happened. */
  isLoading: boolean
  saveProfile: (profile: Profile) => void
  /** Wipes the on-device profile — the "start over" / "forget me" action. */
  resetProfile: () => void
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)
