import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function Modal({
  open,
  onClose,
  children,
  maxWidth = '520px',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div
        className="relative flex max-h-[88vh] w-full flex-col gap-5 overflow-y-auto rounded-[26px] bg-card p-8 shadow-2xl"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  )
}
