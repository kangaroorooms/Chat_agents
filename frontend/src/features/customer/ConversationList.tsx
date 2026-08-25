import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/error'
import { formatTimestamp } from '../../utils/date'
import conversationService from '../../services/conversation.service'
import type { Conversation } from '../../types/conversation'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../../components/ui/EmptyState'
import { ROUTES } from '../../config/routes'
import type { ConversationState } from '../../constants/conversation'

type ConversationFetchFn = (opts: { limit?: number; cursor?: string; search?: string; state?: string | undefined }) => Promise<{ items: Conversation[]; pagination: { nextCursor: string | null } | null }>

type Props = {
  limit?: number
  onNew?: () => void
  onSelect?: (conversation: Conversation) => void
  activeConversationId?: string | null
  linkBasePath?: string
  state?: ConversationState
  refreshKey?: number
  fetchConversations?: ConversationFetchFn
}

export default function ConversationList({
  limit = 10,
  onNew,
  onSelect,
  activeConversationId = null,
  linkBasePath = ROUTES.customerConversations,
  state,
  refreshKey = 0,
  fetchConversations,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const navigate = useNavigate()

  const getErrMsg = (e: unknown, fallback = 'Failed to load conversations') => getErrorMessage(e, fallback)

  const fetch = async (reset = false, cursorOverride?: string) => {
    setLoading(true)
    setError(null)
    try {
      const fn = fetchConversations ?? conversationService.listConversations
      const res = await fn({
        limit,
        cursor: reset ? undefined : cursorOverride ?? cursor ?? undefined,
        search: search || undefined,
        state,
      })
      const items = (res.items as Conversation[]) || []
      setConversations((current) => (reset ? items : [...current, ...items]))
      setCursor(cursorOverride ?? null)
      setNextCursor(res.pagination?.nextCursor ?? null)
    } catch (err: unknown) {
      setError(getErrMsg(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => await fetch(true))()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, refreshKey])

  const handleLoadMore = () => {
    if (!nextCursor) return
    void fetch(false, nextCursor)
  }

  const handleNewConversation = () => {
    if (onNew) return onNew()
    const participantId = window.prompt('Enter participant id or email')
    if (!participantId) return
    ;(async () => {
      try {
        setLoading(true)
        const conv = await conversationService.createConversation(participantId)
        navigate(`/customer/conversations/${conv.id}`)
      } catch (err: unknown) {
        window.alert(getErrMsg(err, 'Failed to create conversation'))
      } finally {
        setLoading(false)
      }
    })()
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Conversations</h2>
          <p className="page-copy">Browse your recent threads and open new requests.</p>
        </div>
        <div className="panel-actions">
          <button type="button" className="btn btn-secondary" onClick={() => fetch(true)}>
            Search
          </button>
          {onNew && (
            <button type="button" className="btn btn-primary" onClick={handleNewConversation}>
              New Conversation
            </button>
          )}
        </div>
      </div>

      <div className="panel-body">
        <div className="conversation-toolbar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="input-field"
          />
        </div>

        {loading && <p>Loading...</p>}
        {error && <div className="error-message">{error}</div>}

        {!loading && conversations.length === 0 && <EmptyState title="No conversations yet" subtitle="Create a new chat to get started." />}

        <ul className="conversation-list">
          {conversations.map((c) => (
            <li key={c.id} className={`conversation-item ${activeConversationId === c.id ? 'active' : ''}`}>
              {onSelect ? (
                <button type="button" className="conversation-item-button" onClick={() => onSelect(c)}>
                  {c.title || c.participants?.find((p) => p.user.role === 'CUSTOMER')?.user.username || c.participants?.[0]?.user.username || c.id}
                </button>
              ) : (
                <Link to={`${linkBasePath}/${c.id}`} className="conversation-item-link">
                  {c.title || c.participants?.find((p) => p.user.role === 'CUSTOMER')?.user.username || c.participants?.[0]?.user.username || c.id}
                </Link>
              )}
              <div className="conversation-item-meta">
                <span>Status: {c.state ?? 'OPEN'}</span>
                {c.queueState && <span>Queue: {c.queueState}</span>}
                {c.owner && <span>Owner: {c.owner.username}</span>}
                {c.participants?.length ? <span>Participants: {c.participants.map((p) => p.user.username).join(', ')}</span> : null}
                <span>Updated: {formatTimestamp(c.lastMessageAt ?? c.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>

        {nextCursor && (
          <div className="panel-actions">
            <button type="button" className="btn btn-secondary" onClick={handleLoadMore}>
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
