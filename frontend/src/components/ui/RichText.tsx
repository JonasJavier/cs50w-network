import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { hashtagPath, tokenize } from '../../lib/richtext'

const LINK_CLASS = 'font-medium text-brand-600 hover:underline dark:text-brand-400'

/** Renders post/comment text with clickable links, @mentions and #hashtags. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const nodes: ReactNode[] = tokenize(text).map((token, index) => {
    switch (token.type) {
      case 'url':
        return (
          <a
            key={index}
            href={token.value}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={`${LINK_CLASS} break-all`}
            onClick={(event) => event.stopPropagation()}
          >
            {token.value.replace(/^https?:\/\//, '')}
          </a>
        )
      case 'mention':
        return (
          <Link
            key={index}
            to={`/profile/${token.value.slice(1)}`}
            className={LINK_CLASS}
            onClick={(event) => event.stopPropagation()}
          >
            {token.value}
          </Link>
        )
      case 'hashtag':
        return (
          <Link
            key={index}
            to={hashtagPath(token.value)}
            className={LINK_CLASS}
            onClick={(event) => event.stopPropagation()}
          >
            {token.value}
          </Link>
        )
      default:
        return <Fragment key={index}>{token.value}</Fragment>
    }
  })
  return <span className={className}>{nodes}</span>
}
