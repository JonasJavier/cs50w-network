import { CalendarDays, Globe, ImageIcon, MapPin, Pencil, UserX } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { PostFeed } from '../components/posts/PostFeed'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Lightbox } from '../components/ui/Lightbox'
import { PageSpinner } from '../components/ui/Spinner'
import { Tabs } from '../components/ui/Tabs'
import { EditProfileModal } from '../components/users/EditProfileModal'
import { FollowButton } from '../components/users/FollowButton'
import { UserListModal } from '../components/users/UserListModal'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePostsFeed } from '../hooks/usePosts'
import { useProfile, useRelationList, type Relation } from '../hooks/useUsers'
import { formatCount, formatMonthYear, prettyUrl } from '../lib/utils'
import { useAuthStore } from '../stores/auth'

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'media', label: 'Media' },
  { key: 'likes', label: 'Likes' },
] as const

type Tab = (typeof TABS)[number]['key']

function RelationModal({
  username,
  relation,
  onClose,
}: {
  username: string
  relation: Relation
  onClose: () => void
}) {
  const list = useRelationList(username, relation)
  return (
    <UserListModal
      title={relation === 'followers' ? 'Followers' : 'Following'}
      query={list}
      emptyText={relation === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
      onClose={onClose}
    />
  )
}

function MediaGrid({ username }: { username: string }) {
  const feed = usePostsFeed({ author: username, media: true })
  const sentinel = useInfiniteScroll({
    hasNextPage: feed.hasNextPage,
    isFetchingNextPage: feed.isFetchingNextPage,
    fetchNextPage: feed.fetchNextPage,
  })
  const [lightbox, setLightbox] = useState<string | null>(null)
  const posts = feed.data?.pages.flatMap((page) => page.results) ?? []

  if (feed.isPending) return <PageSpinner />
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No media yet"
        description="Photos shared in posts will show up here."
      />
    )
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
          >
            <button
              type="button"
              onClick={() => setLightbox(post.image)}
              aria-label="Open image"
              className="size-full"
            >
              <img
                src={post.image!}
                alt=""
                loading="lazy"
                className="size-full object-cover transition group-hover:scale-105"
              />
            </button>
            <Link
              to={`/post/${post.id}`}
              className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-medium text-white transition group-focus-within:translate-y-0 group-hover:translate-y-0"
            >
              View post →
            </Link>
          </div>
        ))}
      </div>
      <div ref={sentinel} aria-hidden />
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </>
  )
}

export function ProfilePage() {
  const { username = '' } = useParams()
  const me = useAuthStore((state) => state.user)
  const profile = useProfile(username)
  // The URL drives both the section tab (?tab=media|likes) and the people modals
  // (?tab=followers|following), so every view is deep-linkable.
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const relation: Relation | null =
    requested === 'followers' || requested === 'following' ? requested : null
  const tab: Tab = requested === 'media' || requested === 'likes' ? requested : 'posts'
  const setTab = (key: Tab) => setParams(key === 'posts' ? {} : { tab: key }, { replace: true })
  const setRelation = (next: Relation | null) =>
    setParams(next ? { tab: next } : {}, { replace: true })
  const [editing, setEditing] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  usePageTitle(profile.data ? `${profile.data.name} (@${profile.data.username})` : 'Profile')

  if (profile.isPending) return <PageSpinner />
  if (profile.isError || !profile.data) {
    return (
      <EmptyState
        icon={UserX}
        title="Profile not found"
        description={`There is no user named @${username}.`}
        action={
          <Link
            to="/"
            className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Back to the feed
          </Link>
        }
      />
    )
  }

  const user = profile.data
  const isMe = me?.username === user.username

  return (
    <div className="space-y-4">
      <section className="animate-fade-in overflow-hidden card" aria-label="Profile header">
        <div className="h-40 bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500 sm:h-52">
          {user.cover && (
            <button
              type="button"
              onClick={() => setLightbox(user.cover)}
              className="size-full"
              aria-label="Open cover photo"
            >
              <img src={user.cover} alt="" className="size-full object-cover" />
            </button>
          )}
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-end justify-between gap-3">
            <button
              type="button"
              onClick={() => user.avatar && setLightbox(user.avatar)}
              className="-mt-14 rounded-full"
              aria-label={user.avatar ? 'Open profile photo' : undefined}
              disabled={!user.avatar}
            >
              <Avatar user={user} size="xl" className="ring-4 ring-white dark:ring-zinc-900" />
            </button>
            <div className="pt-3">
              {isMe ? (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" />
                  Edit profile
                </Button>
              ) : (
                <FollowButton username={user.username} isFollowing={user.is_following} />
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-xl font-extrabold">{user.name}</h1>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">@{user.username}</span>
            {user.follows_you && !isMe && (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Follows you
              </span>
            )}
          </div>
          {user.headline && <p className="mt-1.5 text-[15px] font-medium">{user.headline}</p>}
          {user.bio && (
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
              {user.bio}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            {user.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {user.location}
              </span>
            )}
            {user.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
              >
                <Globe className="size-4" />
                {prettyUrl(user.website)}
              </a>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" />
              Joined {formatMonthYear(user.date_joined)}
            </span>
          </div>

          <div className="mt-4 flex gap-5 text-sm">
            <span>
              <strong className="tabular-nums">{formatCount(user.posts_count)}</strong>{' '}
              <span className="text-zinc-500">Posts</span>
            </span>
            <button
              type="button"
              onClick={() => setRelation('followers')}
              className="rounded hover:underline"
            >
              <strong className="tabular-nums">{formatCount(user.followers_count)}</strong>{' '}
              <span className="text-zinc-500">Followers</span>
            </button>
            <button
              type="button"
              onClick={() => setRelation('following')}
              className="rounded hover:underline"
            >
              <strong className="tabular-nums">{formatCount(user.following_count)}</strong>{' '}
              <span className="text-zinc-500">Following</span>
            </button>
          </div>
        </div>
      </section>

      <Tabs aria-label="Profile sections" items={TABS} value={tab} onChange={setTab} />

      {tab === 'posts' && (
        <PostFeed
          key={`posts-${user.username}`}
          filters={{ author: user.username }}
          emptyTitle={isMe ? "You haven't posted yet" : `${user.name} hasn't posted yet`}
          emptyDescription={isMe ? 'Share your first update with your network.' : undefined}
        />
      )}
      {tab === 'media' && <MediaGrid username={user.username} />}
      {tab === 'likes' && (
        <PostFeed
          key={`likes-${user.username}`}
          filters={{ liked_by: user.username }}
          emptyTitle="No likes yet"
          emptyDescription={
            isMe ? 'Posts you like will show up here.' : `${user.name} hasn't liked any posts yet.`
          }
        />
      )}

      {isMe && editing && (
        <EditProfileModal user={user} open={editing} onClose={() => setEditing(false)} />
      )}
      {relation && (
        <RelationModal
          username={user.username}
          relation={relation}
          onClose={() => setRelation(null)}
        />
      )}
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
