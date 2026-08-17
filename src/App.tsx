import { Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RequireProfile } from './components/RequireProfile'
import { Breathe } from './routes/Breathe'
import { Home } from './routes/Home'
import { Journal } from './routes/Journal'
import { Echo } from './routes/Echo'
import { Landing } from './routes/Landing'
import { Mood } from './routes/Mood'
import { NotFound } from './routes/NotFound'
import { Onboarding } from './routes/Onboarding'
import { Ask } from './routes/Ask'
import { Recovery } from './routes/Recovery'
import { SelfCheck } from './routes/SelfCheck'
import { Settings } from './routes/Settings'
import { Tour } from './routes/Tour'

/** The signed-in screens, all behind the same on-device profile gate. */
const GUARDED = [
  { path: '/home', element: <Home /> },
  { path: '/mood', element: <Mood /> },
  { path: '/self-check', element: <SelfCheck /> },
  { path: '/echo', element: <Echo /> },
  { path: '/ask', element: <Ask /> },
  { path: '/journal', element: <Journal /> },
  { path: '/breathe', element: <Breathe /> },
  { path: '/recovery', element: <Recovery /> },
  { path: '/settings', element: <Settings /> },
]

/**
 * Routes.
 *
 *   /            landing — always reachable, it is the front door
 *   /tour        the guided walkthrough, ungated so it can be seen first
 *   /onboarding  the three-step flow (redirects to /home once a profile exists)
 *   /home        your space
 *   /mood        the daily check-in and its history
 *   /self-check  the validated PHQ-9 / GAD-7 questionnaires
 *   /echo        on-device semantic search across your own entries
 *   /ask         evidence-first answers to health questions
 *   /journal     prompt, composer and earlier entries
 *   /breathe     guided breathing sessions
 *   /recovery    concussion symptom tracking and graduated return plans
 *   /settings    export, erase and sample data
 *
 * Everything after /onboarding is gated on an on-device profile.
 */
function App() {
  return (
    // Inside the router, so the fallback's "start again" link is a real
    // navigation rather than a full page load into the same broken state.
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/*
          Ungated on purpose. The tour exists to help someone decide whether
          to use Mindful, and putting it behind the profile gate would ask
          them to commit before they can look.
        */}
        <Route path="/tour" element={<Tour />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {GUARDED.map(({ path, element }) => (
          <Route key={path} path={path} element={<RequireProfile>{element}</RequireProfile>} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
