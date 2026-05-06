import { AppProviders } from '@/contexts'
import { AppRoutes } from '@/routes'

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  )
}

export default App
