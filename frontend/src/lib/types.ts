export interface UserMini {
  id: number
  username: string
  name: string
  headline: string
  avatar: string | null
}

export interface UserCard extends UserMini {
  is_following: boolean
  follows_you: boolean
  followers_count: number
}

export interface UserDetail extends UserCard {
  first_name: string
  last_name: string
  bio: string
  location: string
  website: string
  cover: string | null
  following_count: number
  posts_count: number
  date_joined: string
}

/** The authenticated user's own profile (adds private fields). */
export interface Me extends UserDetail {
  email: string
  last_login: string | null
}

/** Shared shape of a post; the original embedded in a repost/quote has no `repost_of` of its own. */
export interface PostBase {
  id: number
  author: UserMini
  content: string
  image: string | null
  hashtags: string[]
  created_at: string
  updated_at: string
  is_edited: boolean
  likes_count: number
  comments_count: number
  reposts_count: number
  is_liked: boolean
  is_reposted: boolean
  is_bookmarked: boolean
}

export type PostPreview = PostBase

export interface Post extends PostBase {
  repost_of: PostPreview | null
  /** Plain repost (no own content) — render the original with a "reposted" header. */
  is_repost: boolean
}

export interface Comment {
  id: number
  post: number
  author: UserMini
  content: string
  created_at: string
  updated_at: string
  is_edited: boolean
  likes_count: number
  is_liked: boolean
  replies: Comment[]
}

export type NotificationVerb =
  'follow' | 'like_post' | 'comment' | 'reply' | 'like_comment' | 'mention' | 'repost' | 'quote'

export interface AppNotification {
  id: number
  actor: UserMini
  verb: NotificationVerb
  post: number | null
  comment: number | null
  post_preview: string
  comment_preview: string
  is_read: boolean
  created_at: string
}

export interface Hashtag {
  name: string
  posts_count: number
}

/** Cursor-paginated response (posts, notifications). */
export interface CursorPage<T> {
  next: string | null
  previous: string | null
  results: T[]
}

/** Page-number-paginated response (users, comments). */
export interface CountPage<T> extends CursorPage<T> {
  count: number
}

export interface TokenPair {
  access: string
  refresh: string
  user: Me
}

export interface LikeResponse {
  is_liked: boolean
  likes_count: number
}

export interface RepostResponse {
  is_reposted: boolean
  reposts_count: number
}

export interface BookmarkResponse {
  is_bookmarked: boolean
}

export interface FollowResponse {
  is_following: boolean
  followers_count: number
}
