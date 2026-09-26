import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { apiErrorMessage, apiFieldErrors } from './api'

function axiosError(status: number, data: unknown, code?: string): AxiosError {
  const response = {
    status,
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse
  return new AxiosError('Request failed', code, undefined, undefined, status ? response : undefined)
}

describe('apiErrorMessage', () => {
  it('returns the fallback for non-axios errors', () => {
    expect(apiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
  })

  it('reports network failures and timeouts', () => {
    expect(apiErrorMessage(axiosError(0, null))).toMatch(/cannot reach the server/i)
    expect(apiErrorMessage(axiosError(0, null, 'ECONNABORTED'))).toMatch(/timed out/i)
  })

  it('prefers the "detail" key', () => {
    expect(apiErrorMessage(axiosError(401, { detail: 'Invalid credentials.' }))).toBe(
      'Invalid credentials.',
    )
  })

  it('labels field errors unless the message already names the field', () => {
    expect(apiErrorMessage(axiosError(400, { email: ['Enter a valid address.'] }))).toBe(
      'Email: Enter a valid address.',
    )
    expect(apiErrorMessage(axiosError(400, { username: ['This username is reserved.'] }))).toBe(
      'This username is reserved.',
    )
    expect(apiErrorMessage(axiosError(400, { non_field_errors: ['Nope'] }))).toBe('Nope')
  })

  it('has friendly messages for 429 and 5xx', () => {
    expect(apiErrorMessage(axiosError(429, { detail: 'throttled' }))).toMatch(/too many attempts/i)
    expect(apiErrorMessage(axiosError(502, '<html>'))).toMatch(/server had a problem/i)
  })
})

describe('apiFieldErrors', () => {
  it('maps DRF 400 payloads to a flat record', () => {
    expect(
      apiFieldErrors(
        axiosError(400, { email: ['Taken.'], password: ['Too short.', 'Too common.'] }),
      ),
    ).toEqual({ email: 'Taken.', password: 'Too short.' })
  })

  it('returns an empty record for other statuses', () => {
    expect(apiFieldErrors(axiosError(500, { detail: 'x' }))).toEqual({})
  })
})
