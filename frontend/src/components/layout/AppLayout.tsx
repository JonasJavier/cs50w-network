import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { useMe } from '../../hooks/useAuth'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { PageSpinner } from '../ui/Spinner'
import { MobileNav } from './MobileNav'
import { Navbar } from './Navbar'
import { SidebarLeft } from './SidebarLeft'
import { SidebarRight } from './SidebarRight'

export function AppLayout() {
  useMe()

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <SidebarLeft />
        <main id="main" className="min-w-0">
          <ErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <SidebarRight />
      </div>
      <MobileNav />
    </div>
  )
}
