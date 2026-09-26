import type { PostPreview } from '../../lib/types'
import { Modal } from '../ui/Modal'
import { PostComposer } from './PostComposer'

interface QuoteModalProps {
  post: PostPreview | null
  onClose: () => void
}

export function QuoteModal({ post, onClose }: QuoteModalProps) {
  return (
    <Modal open={post !== null} onClose={onClose} title="Quote post" className="max-w-xl">
      {post && (
        <PostComposer
          quoteOf={post}
          placeholder="Add your thoughts…"
          autoFocus
          onPosted={onClose}
          className="border-0 p-0 shadow-none"
        />
      )}
    </Modal>
  )
}
