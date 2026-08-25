import ConversationList from '../features/customer/ConversationList'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import NewConversationModal from '../features/customer/NewConversationModal'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [conversationRefreshKey, setConversationRefreshKey] = useState(0)

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-header-left">
          <p className="eyebrow">Customer dashboard</p>
          <h1 className="page-title">Welcome back{user ? `, ${user.username}` : ''}!</h1>
          <p className="page-copy">Your recent conversations and support requests are ready in one polished space.</p>
        </div>
        <div className="panel-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
            New conversation
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card"><span className="summary-icon">▤</span><div><p>Open conversations</p><strong>0</strong></div></div>
        <div className="summary-card"><span className="summary-icon">◷</span><div><p>Pending response</p><strong>0</strong></div></div>
        <div className="summary-card"><span className="summary-icon">✓</span><div><p>Resolved</p><strong>0</strong></div></div>
      </div>

      <ConversationList limit={10} onNew={() => setShowNew(true)} refreshKey={conversationRefreshKey} />

      {showNew && <NewConversationModal onClose={() => setShowNew(false)} onCreated={() => setConversationRefreshKey((key) => key + 1)} />}
    </div>
  )
}
