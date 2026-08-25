export default function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📭</div>
      <h4>{title}</h4>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}
