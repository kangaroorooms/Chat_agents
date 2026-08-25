import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { getErrorMessage } from '../../utils/error'
import conversationService from '../../services/conversation.service'
import userService from '../../services/user.service'
import type { User } from '../../types/user'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../config/routes'

type Props = { onClose: () => void; onCreated?: () => void }

function friendlyError(error: unknown) {
  const message = getErrorMessage(error, '').toLowerCase()
  if (message.includes('unauthorized') || message.includes('auth')) return 'Your session has expired. Please sign in again.'
  if (message.includes('already') || message.includes('exist')) return 'A conversation with this agent already exists.'
  if (message.includes('network') || message.includes('timeout')) return 'Unable to connect right now. Check your connection and try again.'
  return 'We could not create the conversation. Please try again.'
}

export default function NewConversationModal({ onClose, onCreated }: Props) {
  const [agents, setAgents] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    userService.searchAgents({ search: search.trim() || undefined, limit: 20 })
      .then((result) => { if (active) setAgents(result.items) })
      .catch(() => { if (active) setError('Unable to load support agents. Please try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [search])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setLoading(true)
    setError('')
  }

  const handleCreateConversation = async () => {
    if (!selectedAgent || creating) return

    try {
      setCreating(true)
      setError('')
      const conv = await conversationService.createConversation(selectedAgent.id)
      onCreated?.()
      onClose()
      navigate(`${ROUTES.customerConversations}/${conv.id}`)
    } catch (err: unknown) {
      setError(friendlyError(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal title="Start a conversation" onClose={creating ? () => undefined : onClose}>
      <div className="new-conversation-modal panel-body">
        <div className="form-group">
          <label htmlFor="agentSearch">Find a support agent</label>
          <input
            id="agentSearch"
            type="search"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            disabled={creating}
            autoComplete="off"
            className="input-field"
          />
        </div>

        {error && <div className="error-message" role="alert">{error}</div>}
        {loading && <div className="agent-search-loading" aria-live="polite"><span className="spinner-small" />Searching support agents...</div>}
        {!loading && !error && agents.length === 0 && <EmptyState title={search.trim() ? 'No matching agents' : 'No support agents available.'} subtitle={search.trim() ? 'Try a different name or email.' : 'There are no support agents to start a conversation with yet.'} />}
        {!loading && agents.length > 0 && (
          <div className="agent-results" role="listbox" aria-label="Support agents">
            {agents.map((agent) => (
              <button key={agent.id} type="button" role="option" aria-selected={selectedAgent?.id === agent.id} className={`agent-result ${selectedAgent?.id === agent.id ? 'selected' : ''}`} onClick={() => setSelectedAgent(agent)} disabled={creating}>
                <span className="avatar avatar-small">{agent.username.charAt(0).toUpperCase()}</span>
                <span className="agent-result-copy"><strong>{agent.username}</strong><span>{agent.email}</span></span>
                <span aria-hidden="true">{selectedAgent?.id === agent.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>
        )}

        <div className="panel-actions modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateConversation} disabled={creating || !selectedAgent}>
            {creating ? <><span className="spinner" /> Creating...</> : 'Start conversation'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
