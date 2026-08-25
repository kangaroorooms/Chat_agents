import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useParams } from 'react-router-dom'
import { SocketEvents } from '../services/socket.events'
import socketService from '../services/socket.service'
import ConversationList from '../features/customer/ConversationList'
import AgentConversationDetail from '../features/agent/AgentConversationDetail'
import EmptyState from '../components/ui/EmptyState'
import { ROUTES } from '../config/routes'
import conversationService from '../services/conversation.service'

export default function AgentDashboard() {
  const { user } = useAuth()
  const params = useParams<{ conversationId: string }>()
  const selectedConversationId = params.conversationId ?? null
  const [queueRefreshKey, setQueueRefreshKey] = useState(0)
  const summaryCount = useMemo(() => (selectedConversationId ? 1 : 0), [selectedConversationId])

  const refreshQueue = useCallback(() => setQueueRefreshKey((prev) => prev + 1), [])

  useEffect(() => {
    socketService.connect()

    if (user?.companyId) {
      void socketService.joinCompanyRoom(user.companyId)
    }

    const unsubscribe = socketService.on(SocketEvents.CONVERSATION_UPDATED, () => {
      refreshQueue()
    })

    return () => {
      unsubscribe()
      void socketService.leaveCompanyRoom()
    }
  }, [refreshQueue, user?.companyId])

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-header-left">
          <p className="eyebrow">Agent workspace</p>
          <h1 className="page-title">Open conversations</h1>
          <p className="page-copy">Manage your queue and respond to customer requests quickly.</p>
        </div>
        <div className="panel-actions">
          <span className="badge">Selected: {summaryCount}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Active queue</h2>
            <p className="page-copy">Current open requests ready for your review.</p>
          </div>
          <ConversationList
            limit={20}
            activeConversationId={selectedConversationId}
            linkBasePath={ROUTES.agentConversations}
            fetchConversations={conversationService.listAgentQueue}
            refreshKey={queueRefreshKey}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Conversation details</h2>
          </div>
          {selectedConversationId ? (
            <AgentConversationDetail
              conversationId={selectedConversationId}
              refreshKey={queueRefreshKey}
              onQueueRefresh={refreshQueue}
            />
          ) : (
            <EmptyState title="Select a conversation" subtitle="Choose a thread to review and respond to." />
          )}
        </section>
      </div>
    </div>
  )
}
