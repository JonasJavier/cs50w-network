import { describe, expect, it } from 'vitest'
import { hashtagPath, tokenize } from './richtext'

describe('tokenize', () => {
  it('returns plain text unchanged', () => {
    expect(tokenize('hello world')).toEqual([{ type: 'text', value: 'hello world' }])
  })

  it('detects hashtags, mentions and urls', () => {
    expect(tokenize('Hi @ada, see #Django at https://docs.djangoproject.com/en/!')).toEqual([
      { type: 'text', value: 'Hi ' },
      { type: 'mention', value: '@ada' },
      { type: 'text', value: ', see ' },
      { type: 'hashtag', value: '#Django' },
      { type: 'text', value: ' at ' },
      { type: 'url', value: 'https://docs.djangoproject.com/en/' },
      { type: 'text', value: '!' },
    ])
  })

  it('ignores e-mail addresses and numeric hashtags', () => {
    expect(tokenize('mail me@example.com about #2024')).toEqual([
      { type: 'text', value: 'mail me@example.com about ' },
      { type: 'text', value: '#2024' },
    ])
  })

  it('does not include a trailing dot in a mention', () => {
    expect(tokenize('Thanks @linus.')).toEqual([
      { type: 'text', value: 'Thanks ' },
      { type: 'mention', value: '@linus' },
      { type: 'text', value: '.' },
    ])
  })

  it('supports unicode hashtags', () => {
    expect(tokenize('#programación')).toEqual([{ type: 'hashtag', value: '#programación' }])
  })
})

describe('hashtagPath', () => {
  it('builds the search route with an encoded hash', () => {
    expect(hashtagPath('django')).toBe('/search?q=%23django')
    expect(hashtagPath('#react')).toBe('/search?q=%23react')
  })
})
