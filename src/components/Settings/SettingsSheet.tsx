import { useEffect, type ReactNode } from 'react'

interface SettingsSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function SettingsSheet({
  title,
  onClose,
  children,
}: SettingsSheetProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="settings-sheet-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-sheet__heading">
          <h2 id="settings-sheet-title">{title}</h2>
          <button type="button" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
