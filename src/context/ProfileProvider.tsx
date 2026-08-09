import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  PROFILE_STORAGE_KEY,
  clearProfile,
  loadProfile,
  parseProfile,
  saveProfile as persistProfile,
  type Profile,
} from '../lib/profile'
import { ProfileContext, type ProfileContextValue } from './profile-context'

/**
 * Holds the on-device profile for the whole app.
 *
 * The initial read is deferred to an effect rather than done during render so
 * the first paint is identical on every load (no flash of the wrong screen
 * caused by synchronous storage access), and so a blocked-storage environment
 * degrades to "not onboarded" instead of throwing.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setProfile(loadProfile())
    setIsLoading(false)
  }, [])

  // Keep tabs in sync: clearing your profile in one tab logs the others out too.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== PROFILE_STORAGE_KEY) return
      setProfile(parseProfile(event.newValue ?? null) ?? loadProfile())
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const save = useCallback((next: Profile) => {
    persistProfile(next)
    setProfile(next)
  }, [])

  const reset = useCallback(() => {
    clearProfile()
    setProfile(null)
  }, [])

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, isLoading, saveProfile: save, resetProfile: reset }),
    [profile, isLoading, save, reset],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export default ProfileProvider
