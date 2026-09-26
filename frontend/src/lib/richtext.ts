// URL · @mention · #hashtag — kept in sync with the backend parsers (apps/core/text.py).
const TOKEN_RE =
  /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|(?<![\p{L}\p{N}_.@])(@[A-Za-z0-9_.]{1,30}(?<!\.))|(?<![\p{L}\p{N}_&])(#[\p{L}\p{N}][\p{L}\p{N}_]{0,49})/gu

export interface RichTextToken {
  type: 'text' | 'url' | 'mention' | 'hashtag'
  value: string
}

/** Split a string into plain text, links, mentions and hashtags. */
export function tokenize(text: string): RichTextToken[] {
  const tokens: RichTextToken[] = []
  let last = 0
  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0
    if (index > last) tokens.push({ type: 'text', value: text.slice(last, index) })
    if (match[1]) tokens.push({ type: 'url', value: match[1] })
    else if (match[2]) tokens.push({ type: 'mention', value: match[2] })
    else if (match[3]) {
      const tag = match[3]
      // "#2024" is not a topic — needs at least one letter (same rule as the API).
      if (/\p{L}/u.test(tag)) tokens.push({ type: 'hashtag', value: tag })
      else tokens.push({ type: 'text', value: tag })
    }
    last = index + match[0].length
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) })
  return tokens
}

/** Route for a hashtag search: "#django" or "django" → /search?q=%23django */
export function hashtagPath(tag: string): string {
  return `/search?q=${encodeURIComponent(`#${tag.replace(/^#/, '')}`)}`
}
