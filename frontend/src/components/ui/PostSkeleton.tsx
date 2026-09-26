function Bone({ className }: { className: string }) {
  return <div className={`rounded bg-zinc-200 dark:bg-zinc-800 ${className}`} />
}

export function PostSkeleton() {
  return (
    <div className="animate-pulse card p-4" aria-hidden>
      <div className="flex items-center gap-3">
        <Bone className="size-11 rounded-full" />
        <div className="space-y-2">
          <Bone className="h-3 w-32" />
          <Bone className="h-2.5 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-5/6" />
        <Bone className="h-3 w-2/3" />
      </div>
      <div className="mt-4 flex gap-4">
        <Bone className="h-6 w-14 rounded-full" />
        <Bone className="h-6 w-14 rounded-full" />
        <Bone className="h-6 w-14 rounded-full" />
      </div>
    </div>
  )
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading posts" className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <PostSkeleton key={index} />
      ))}
    </div>
  )
}

export function UserListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading people" className="space-y-3 py-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3">
          <Bone className="size-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-2.5 w-32" />
          </div>
          <Bone className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
