import { useContext } from 'react'
import { ProfileContext, type ProfileContextValue } from '../context/profile-context'

/** Access the on-device profile. Must be used inside `<ProfileProvider>`. */
export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext)
  if (!value) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return value
}
