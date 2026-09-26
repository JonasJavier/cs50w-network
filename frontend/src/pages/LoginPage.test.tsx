import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { me, renderWithProviders } from '../test/render'
import { useAuthStore } from '../stores/auth'
import { LoginPage } from './LoginPage'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } }
})

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>Feed</h1>} />
    </Routes>,
    { route: '/login' },
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ access: null, refresh: null, user: null })
    vi.mocked(api.post).mockReset()
  })

  it('logs in, stores tokens and redirects home', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { access: 'a', refresh: 'r', user: me } })
    renderLogin()
    await userEvent.type(screen.getByLabelText('Username or email'), 'ada')
    await userEvent.type(screen.getByLabelText('Password'), 'network123')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(api.post).toHaveBeenCalledWith('/auth/token/', {
      username: 'ada',
      password: 'network123',
    })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Feed' })).toBeInTheDocument())
    expect(useAuthStore.getState().access).toBe('a')
    expect(useAuthStore.getState().user?.username).toBe('ada')
  })

  it('shows the API error message on failure', async () => {
    const response = {
      status: 401,
      data: { detail: 'Invalid credentials.' },
      headers: {},
      config: { headers: new AxiosHeaders() },
    } as AxiosResponse
    vi.mocked(api.post).mockRejectedValue(
      new AxiosError('x', '401', undefined, undefined, response),
    )
    renderLogin()
    await userEvent.type(screen.getByLabelText('Username or email'), 'ada')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials.')
    expect(useAuthStore.getState().access).toBeNull()
  })

  it('fills a demo account on click', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: '@grace' }))
    expect(screen.getByLabelText('Username or email')).toHaveValue('grace')
    expect(screen.getByLabelText('Password')).toHaveValue('network123')
  })
})
