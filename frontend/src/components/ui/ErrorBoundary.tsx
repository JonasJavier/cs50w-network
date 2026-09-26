import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Catches render errors so a single broken screen never blanks the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          An unexpected error happened while rendering this page. Reloading usually fixes it.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    )
  }
}
