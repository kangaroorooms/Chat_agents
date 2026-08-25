import Button from './Button'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger }: { title?: string; message?: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div className="confirm-dialog" style={{ width: 450 }}>
      <div style={{ padding: '16px 20px', textAlign: 'center' }}>
        {title && <h4 className="panel-title">{title}</h4>}
        {message && <p className="page-copy">{message}</p>}
      </div>
      <div className="panel-actions" style={{ justifyContent: 'center', gap: 12, padding: '12px 20px' }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{danger ? 'Delete' : 'Confirm'}</Button>
      </div>
    </div>
  )
}
