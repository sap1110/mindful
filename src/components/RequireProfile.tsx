import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'

/**
 * The auth gate.
 *
 * Phase 1 has no accounts: "signed in" simply means a completed profile exists
 * in this browser's storage. Anyone without one is sent to onboarding, with the
 * page they wanted remembered in location state for later.
 */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useProfile()
  const location = useLocation()

  // Hold the frame for the single tick it takes to read storage. Rendering a
  // spinner here would flash on essentially every load.
  if (isLoading) return null

  if (!profile) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default RequireProfile
