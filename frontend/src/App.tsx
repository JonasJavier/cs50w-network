import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { PageSpinner } from './components/ui/Spinner'
import { Toaster } from './components/ui/Toaster'
import { useAuthStore } from './stores/auth'

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const PostDetailPage = lazy(() =>
  import('./pages/PostDetailPage').then((m) => ({ default: m.PostDetailPage })),
)
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const BookmarksPage = lazy(() =>
  import('./pages/BookmarksPage').then((m) => ({ default: m.BookmarksPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

function RequireAuth() {
  const access = useAuthStore((state) => state.access)
  const location = useLocation()
  if (!access) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

function HashtagRedirect() {
  const location = useLocation()
  const tag = decodeURIComponent(location.pathname.replace(/^\/hashtag\//, ''))
  return <Navigate to={`/search?q=${encodeURIComponent(`#${tag}`)}`} replace />
}

export default function App() {
  const access = useAuthStore((state) => state.access)
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/hashtag/:tag" element={<HashtagRedirect />} />
              {access && <Route path="*" element={<NotFoundPage />} />}
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </ErrorBoundary>
  )
}
