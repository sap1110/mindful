import { Route, Routes } from 'react-router-dom'
import { RequireProfile } from './components/RequireProfile'
import { Home } from './routes/Home'
import { Landing } from './routes/Landing'
import { NotFound } from './routes/NotFound'
import { Onboarding } from './routes/Onboarding'

/**
 * Routes.
 *
 *   /            landing — always reachable, it is the front door
 *   /onboarding  the three-step flow (redirects to /home once a profile exists)
 *   /home        your space — gated on an on-device profile
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/home"
        element={
          <RequireProfile>
            <Home />
          </RequireProfile>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
