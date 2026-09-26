import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { usePost } from '../../hooks/usePosts'
import {
  ada,
  createTestQueryClient,
  makePost,
  renderWithProviders,
  signIn,
} from '../../test/render'
import { PostCard } from './PostCard'

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }
})

describe('PostCard', () => {
  beforeEach(() => {
    signIn()
    vi.mocked(api.post).mockReset()
  })

  it('renders the author, rich content and counters', () => {
    renderWithProviders(<PostCard post={makePost()} />)
    expect(screen.getByRole('link', { name: 'Grace Hopper' })).toHaveAttribute(
      'href',
      '/profile/grace',
    )
    expect(screen.getByRole('link', { name: '#network' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '@ada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2 likes' })).toBeInTheDocument()
  })

  it('likes optimistically and calls the API', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { is_liked: true, likes_count: 3 } })
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(['post', 10], makePost())
    // The feed renders cards from the query cache; mirror that so optimistic updates re-render.
    function FromCache() {
      const post = usePost(10)
      return post.data ? <PostCard post={post.data} /> : null
    }
    renderWithProviders(<FromCache />, { queryClient })
    await userEvent.click(await screen.findByRole('button', { name: 'Like' }))
    expect(api.post).toHaveBeenCalledWith('/posts/10/like/')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Unlike' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await waitFor(() => expect(screen.getByRole('button', { name: '3 likes' })).toBeInTheDocument())
  })

  it('shows a "reposted" header and the original author for plain reposts', () => {
    const original = makePost({ id: 5 })
    const { repost_of: _r, is_repost: _i, ...preview } = original
    renderWithProviders(
      <PostCard
        post={makePost({ id: 11, author: ada, content: '', is_repost: true, repost_of: preview })}
      />,
    )
    expect(screen.getByText('reposted')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'You' })).toHaveAttribute('href', '/profile/ada')
    expect(screen.getByRole('link', { name: 'Grace Hopper' })).toBeInTheDocument()
  })

  it('only shows edit/delete to the author', async () => {
    renderWithProviders(<PostCard post={makePost({ author: ada })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Post options' }))
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  it('hides edit/delete for other people’s posts', async () => {
    renderWithProviders(<PostCard post={makePost()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Post options' }))
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeInTheDocument()
  })
})
