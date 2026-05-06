/**
 * AppLayout — outermost chrome that wraps every feature route.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ ImpersonationBanner (only when active)               │
 *   ├──────────────────────────────────────────────────────┤
 *   │ TopBar                                                │
 *   ├──────────┬──────────────────────────────────────────┤
 *   │ Sidebar  │ <Outlet />  (current feature route)       │
 *   │          │                                            │
 *   └──────────┴──────────────────────────────────────────┘
 *
 * Toast region is mounted globally inside ToastProvider.
 */

import { Outlet } from 'react-router-dom'
import { ImpersonationBanner } from '@/components/ui-extensions/ImpersonationBanner'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen flex-col bg-[color:var(--color-surface)]">
      <ImpersonationBanner />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
