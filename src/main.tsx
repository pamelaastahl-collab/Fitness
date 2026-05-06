import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { bootstrapSeed } from '@/mocks'
import './index.css'
import App from './App.tsx'

// Seed the audit event store from in-memory mock data before any component
// has a chance to read it. Safe to call repeatedly (HMR no-ops the second
// invocation via an internal flag).
bootstrapSeed()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
