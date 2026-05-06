import { Route, Routes } from 'react-router-dom'
import { AppProviders } from '@/contexts'
import HomeRoute from '@/routes/HomeRoute'

function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
      </Routes>
    </AppProviders>
  )
}

export default App
