import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import ConversationDetail from '../customer/ConversationDetail'
import aiService from '../../services/ai.service'
import { useRef } from 'react'
import AgentSearch from './AgentSearch'
import conversationService from '../../services/conversation.service'
import Button from '../../components/ui/Button'
import { getErrorMessage } from '../../utils/error'
import { CONVERSATION_STATUS } from '../../constants/conversation'
import type { Conversation } from '../../types/conversation'
import type { User } from '../../types/user'

type Props = {
  conversationId?: string
  refreshKey?: number
  onQueueRefresh?: () => void
}

export default function AgentConversationDetail({ conversationId, refreshKey, onQueueRefresh }: Props) {
  const { user } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [escalateLoading, setEscalateLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [sources, setSources] = useState<Array<{ documentId: string; title: string }>>([])
  const composerSetterRef = useRef<((t: string) => void) | null>(null)

  const canTakeConversation = !!(
    conversation &&
    !conversation.owner &&
    conversation.state !== CONVERSATION_STATUS.CLOSED &&
    conversation.state !== CONVERSATION_STATUS.ARCHIVED
  )

  const canManageOwnership = Boolean(
    conversation &&
    conversation.state !== CONVERSATION_STATUS.CLOSED &&
    conversation.state !== CONVERSATION_STATUS.ARCHIVED &&
    (conversation.owner?.id === user?.id || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
  )

  const handleTakeConversation = async () => {
    if (!conversation || !user?.id) return
    setActionError(null)
    setActionLoading(true)

    try {
      const updated = await conversationService.assignConversation(conversation.id, user.id)
      setConversation(updated)
      onQueueRefresh?.()
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to take conversation'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!conversation || !selectedAgent) return
    if (selectedAgent.id === user?.id || selectedAgent.id === conversation.owner?.id) {
      setActionError('Please select a different agent to transfer to.')
      return
    }

    setActionError(null)
    setTransferLoading(true)

    try {
      const updated = await conversationService.transferConversation(conversation.id, selectedAgent.id)
      setConversation(updated)
      setSelectedAgent(null)
      onQueueRefresh?.()
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to transfer conversation'))
    } finally {
      setTransferLoading(false)
    }
  }

  const handleEscalate = async () => {
    if (!conversation) return
    setActionError(null)
    setEscalateLoading(true)

    try {
      const updated = await conversationService.escalateConversation(conversation.id, selectedAgent?.id)
      setConversation(updated)
      setSelectedAgent(null)
      onQueueRefresh?.()
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to escalate conversation'))
    } finally {
      setEscalateLoading(false)
    }
  }

  const handleGenerateSuggestion = async () => {
    if (!conversationId) return
    setAiError(null)
    setAiLoading(true)
    try {
      const resp = await aiService.getSuggestion(conversationId)
      setSuggestion(resp.suggestion)
      setConfidence(resp.confidence)
      setSources(resp.sources || [])
    } catch (err: unknown) {
      setAiError(getErrorMessage(err, 'Failed to get suggestion'))
    } finally {
      setAiLoading(false)
    }
  }

  const handleCopySuggestion = () => {
    if (!suggestion) return
    void navigator.clipboard.writeText(suggestion)
  }

  const handleInsertSuggestion = () => {
    if (!suggestion) return
    if (composerSetterRef.current) {
      composerSetterRef.current(suggestion)
    } else {
      // fallback: try to focus last textarea in document
      const ta = document.querySelector('.textarea-field') as HTMLTextAreaElement | null
      if (ta) {
        ta.focus()
        ta.value = suggestion
        ta.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  }

  const registerComposer = (setter: (t: string) => void) => {
    composerSetterRef.current = setter
  }

  return (
    <div className="agent-conversation-detail">
      {actionError && <div className="error-message">{actionError}</div>}
      {canTakeConversation && (
        <div className="panel-actions">
          <Button variant="primary" onClick={handleTakeConversation} disabled={actionLoading}>
            {actionLoading ? 'Taking...' : 'Take Conversation'}
          </Button>
        </div>
      )}
      {canManageOwnership && (
        <div className="panel-actions panel-actions-group">
          <AgentSearch
            selectedUserId={selectedAgent?.id}
            onSelect={setSelectedAgent}
            label="Choose an agent"
            placeholder="Search agents to transfer or escalate"
          />
          <div className="agent-action-buttons">
            <Button
              variant="secondary"
              onClick={handleTransfer}
              disabled={!selectedAgent || transferLoading || selectedAgent?.id === conversation?.owner?.id}
            >
              {transferLoading ? 'Transferring...' : 'Transfer'}
            </Button>
            <Button
              variant="primary"
              onClick={handleEscalate}
              disabled={escalateLoading}
            >
              {escalateLoading ? 'Escalating...' : 'Escalate'}
            </Button>
          </div>
        </div>
      )}
      <div className="panel-body ai-assistant-panel">
        <h3 className="panel-title">AI Assistant</h3>
        <div className="ai-actions">
          <Button variant="primary" onClick={handleGenerateSuggestion} disabled={aiLoading}>
            {aiLoading ? 'Generating...' : 'Generate Reply Suggestion'}
          </Button>
        </div>

        {aiLoading && <p className="page-copy">Loading...</p>}
        {aiError && <div className="error-message">{aiError}</div>}

        {suggestion && (
          <div className="ai-suggestion">
            <h4>Suggested Reply:</h4>
            <p className="ai-suggestion-text">{suggestion}</p>
            <p className="ai-confidence">Confidence: {confidence != null ? Math.round(confidence * 100) + '%' : '—'}</p>
            {sources && sources.length > 0 && (
              <div className="ai-sources">
                <strong>Sources:</strong>
                <ul>
                  {sources.map((s) => (
                    <li key={s.documentId}>{s.title}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="ai-action-buttons">
              <Button variant="secondary" onClick={handleCopySuggestion} disabled={!suggestion}>Copy Suggestion</Button>
              <Button variant="primary" onClick={handleInsertSuggestion} disabled={!suggestion}>Insert Into Reply Box</Button>
            </div>
          </div>
        )}
      </div>
      <ConversationDetail
        conversationId={conversationId}
        refreshKey={refreshKey}
        initialConversation={conversation}
        onConversationChange={setConversation}
        registerComposer={registerComposer}
        onActionComplete={onQueueRefresh}
      />
    </div>
  )
}
