import { Route, Routes } from 'react-router-dom'
import { RequireProfile } from './components/RequireProfile'
import { Breathe } from './routes/Breathe'
import { Home } from './routes/Home'
import { Journal } from './routes/Journal'
import { Landing } from './routes/Landing'
import { Mood } from './routes/Mood'
import { NotFound } from './routes/NotFound'
import { Onboarding } from './routes/Onboarding'
import { SelfCheck } from './routes/SelfCheck'
import { Settings } from './routes/Settings'

/** The signed-in screens, all behind the same on-device profile gate. */
const GUARDED = [
  { path: '/home', element: <Home /> },
  { path: '/mood', element: <Mood /> },
  { path: '/self-check', element: <SelfCheck /> },
  { path: '/journal', element: <Journal /> },
  { path: '/breathe', element: <Breathe /> },
  { path: '/settings', element: <Settings /> },
]

/**
 * Routes.
 *
 *   /            landing — always reachable, it is the front door
 *   /onboarding  the three-step flow (redirects to /home once a profile exists)
 *   /home        your space
 *   /mood        the daily check-in and its history
 *   /self-check  the validated PHQ-9 / GAD-7 questionnaires
 *   /journal     prompt, composer and earlier entries
 *   /breathe     guided breathing sessions
 *   /settings    export, erase and sample data
 *
 * Everything after /onboarding is gated on an on-device profile.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      {GUARDED.map(({ path, element }) => (
        <Route key={path} path={path} element={<RequireProfile>{element}</RequireProfile>} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
