import { beforeEach, describe, expect, it } from 'vitest'
import { toast, useToastStore } from './toast'

describe('toast store', () => {
  beforeEach(() => useToastStore.setState({ toasts: [] }))

  it('pushes and dismisses toasts', () => {
    const id = toast.success('Saved')
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      id,
      kind: 'success',
      message: 'Saved',
    })
    useToastStore.getState().dismiss(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('keeps at most four toasts on screen', () => {
    for (let index = 0; index < 6; index += 1) toast.info(`t${index}`)
    const messages = useToastStore.getState().toasts.map((item) => item.message)
    expect(messages).toEqual(['t2', 't3', 't4', 't5'])
  })

  it('gives errors a longer duration', () => {
    toast.error('Oops')
    toast.info('Hi')
    const [error, info] = useToastStore.getState().toasts
    expect(error!.duration).toBeGreaterThan(info!.duration)
  })
})
