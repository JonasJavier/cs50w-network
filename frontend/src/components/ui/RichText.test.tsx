import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RichText } from './RichText'

describe('RichText', () => {
  it('renders mentions and hashtags as internal links, urls as external links', () => {
    render(
      <MemoryRouter>
        <RichText text="Hey @ada, read #django at https://example.com/docs" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '@ada' })).toHaveAttribute('href', '/profile/ada')
    expect(screen.getByRole('link', { name: '#django' })).toHaveAttribute(
      'href',
      '/search?q=%23django',
    )
    const external = screen.getByRole('link', { name: 'example.com/docs' })
    expect(external).toHaveAttribute('href', 'https://example.com/docs')
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})
