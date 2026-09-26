import { describe, expect, it } from 'vitest'
import { formatCount, gradientFor, initials, pluralize, prettyUrl, timeAgo } from './utils'

describe('timeAgo', () => {
  const now = new Date('2026-09-26T12:00:00Z').getTime()

  it('says "just now" for very recent timestamps', () => {
    expect(timeAgo('2026-09-26T11:59:40Z', now)).toBe('just now')
  })

  it('formats minutes, hours and days', () => {
    expect(timeAgo('2026-09-26T11:55:00Z', now)).toBe('5 minutes ago')
    expect(timeAgo('2026-09-26T09:00:00Z', now)).toBe('3 hours ago')
    expect(timeAgo('2026-09-24T12:00:00Z', now)).toBe('2 days ago')
  })

  it('uses natural words for yesterday and last week', () => {
    expect(timeAgo('2026-09-25T12:00:00Z', now)).toBe('yesterday')
    expect(timeAgo('2026-09-19T12:00:00Z', now)).toBe('last week')
  })
})

describe('formatCount', () => {
  it('keeps small numbers as-is', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(999)).toBe('999')
  })

  it('abbreviates thousands and millions', () => {
    expect(formatCount(1000)).toBe('1K')
    expect(formatCount(1250)).toBe('1.3K')
    expect(formatCount(12_400)).toBe('12.4K')
    expect(formatCount(3_400_000)).toBe('3.4M')
  })
})

describe('pluralize', () => {
  it('handles singular and plural', () => {
    expect(pluralize(1, 'post')).toBe('1 post')
    expect(pluralize(2, 'post')).toBe('2 posts')
    expect(pluralize(1, 'reply', 'replies')).toBe('1 reply')
    expect(pluralize(3, 'reply', 'replies')).toBe('3 replies')
  })
})

describe('initials', () => {
  it('takes the first letter of up to two words', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
    expect(initials('grace')).toBe('G')
    expect(initials('  Tim   Berners-Lee  Jr')).toBe('TB')
  })
})

describe('gradientFor', () => {
  it('is deterministic per seed', () => {
    expect(gradientFor('ada')).toBe(gradientFor('ada'))
    expect(gradientFor('ada')).toMatch(/^from-/)
  })
})

describe('prettyUrl', () => {
  it('strips scheme and trailing slash', () => {
    expect(prettyUrl('https://example.com/')).toBe('example.com')
    expect(prettyUrl('http://example.com/path')).toBe('example.com/path')
  })
})
