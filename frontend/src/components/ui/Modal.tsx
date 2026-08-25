import React, { useEffect, useRef } from 'react'

type Props = {
  title?: string
  children: React.ReactNode
  onClose: () => void
  width?: number
  footer?: React.ReactNode
}

export default function Modal({ title, children, onClose, width, footer }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        style={{ width: width ? `${width}px` : undefined }}
      >
        <div className="modal-header">
          <div>
            {title ? <h3 id="modal-title">{title}</h3> : null}
          </div>
          <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="panel-body modal-body">{children}</div>
        {footer ? (
          <div className="modal-footer">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
