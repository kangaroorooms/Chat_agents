import { useCallback, useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import conversationService from '../../services/conversation.service'
import messageService from '../../services/message.service'
import socketService from '../../services/socket.service'
import { SocketEvents } from '../../services/socket.events'
import type { Conversation } from '../../types/conversation'
import type { Message } from '../../types/message'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import { getErrorMessage } from '../../utils/error'
import { formatTimestamp } from '../../utils/date'
import { CONVERSATION_STATUS } from '../../constants/conversation'

type Props = {
  conversationId?: string
  refreshKey?: number
  initialConversation?: Conversation | null
  onConversationChange?: (conversation: Conversation) => void
  onActionComplete?: () => void
  registerComposer?: (setter: (text: string) => void) => void
}

export default function ConversationDetail({ conversationId: conversationIdProp, refreshKey, initialConversation, onConversationChange, onActionComplete, registerComposer }: Props) {
  const params = useParams<{ conversationId: string }>()
  const conversationId = conversationIdProp ?? params.conversationId
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(initialConversation ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const deliveredMessageIdsRef = useRef<Set<string>>(new Set())
  const readMessageIdsRef = useRef<Set<string>>(new Set())
  const typingTimeoutRef = useRef<number | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const shouldScrollToBottomRef = useRef<boolean>(false)

  const sortMessagesChronologically = useCallback((items: Message[]) => {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      if (aTime !== bTime) return aTime - bTime
      return a.id.localeCompare(b.id)
    })
  }, [])

  const acknowledgeMessageDelivery = useCallback((message: Message) => {
    if (!conversationId || !user || message.senderId === user.id) return
    if (deliveredMessageIdsRef.current.has(message.id)) return
    deliveredMessageIdsRef.current.add(message.id)
    void socketService.sendMessageDelivered(message.id).catch(() => {})
  }, [conversationId, user])

  const acknowledgeMessageRead = useCallback((message: Message) => {
    if (!conversationId || !user || message.senderId === user.id) return
    if (readMessageIdsRef.current.has(message.id)) return
    readMessageIdsRef.current.add(message.id)
    void socketService.sendMessageRead(message.id).catch(() => {})
  }, [conversationId, user])

  const acknowledgeIncomingMessages = useCallback((items: Message[]) => {
    items.forEach((message) => {
      if (!user || message.senderId === user.id) return
      acknowledgeMessageDelivery(message)
      acknowledgeMessageRead(message)
    })
  }, [acknowledgeMessageDelivery, acknowledgeMessageRead, user])

  const load = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    setError(null)
    try {
      const conv = await conversationService.getConversation(conversationId)
      setConversation(conv)
      onConversationChange?.(conv)

      const messagesFromConv = Array.isArray(conv.messages) ? conv.messages as Message[] : []
      const hasSenderInfo = messagesFromConv.length > 0 && messagesFromConv.every((message) => message?.sender?.username)

      if (hasSenderInfo) {
        const sorted = sortMessagesChronologically(messagesFromConv)
        setMessages(sorted)
        acknowledgeIncomingMessages(sorted)
      } else {
        const msgs = await messageService.getMessages(conversationId)
        const sorted = sortMessagesChronologically(msgs)
        setMessages(sorted)
        acknowledgeIncomingMessages(sorted)
      }
      shouldScrollToBottomRef.current = true
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load conversation'))
    } finally {
      setLoading(false)
    }
  }, [conversationId, onConversationChange, sortMessagesChronologically, acknowledgeIncomingMessages])

  useEffect(() => {
    // Call load asynchronously to avoid calling setState synchronously inside effect
    Promise.resolve().then(() => { void load() })
  }, [load, refreshKey])

  useEffect(() => {
    if (registerComposer) {
      registerComposer((t: string) => setText(t))
    }
  }, [registerComposer])

  useEffect(() => {
    if (!conversationId) return undefined

    let isMounted = true
    const cleanupHandlers: Array<() => void> = []

    const handleMessageCreated = (payload: unknown) => {
      const message = payload as Message
      if (message.conversationId !== conversationId) return
      if (message.senderId !== user?.id) {
        acknowledgeMessageDelivery(message)
        acknowledgeMessageRead(message)
      }
      setMessages((current) => {
        if (current.some((m) => m.id === message.id)) return current
        shouldScrollToBottomRef.current = true
        return [...current, message]
      })
    }

    const handleConversationAssigned = async (payload: unknown) => {
      const data = payload as { conversationId: string }
      if (data.conversationId !== conversationId) return
      if (!isMounted) return
      try {
        const updated = await conversationService.getConversation(conversationId)
        if (!isMounted) return
        setConversation(updated)
        onConversationChange?.(updated)
      } catch {
        // ignore stale updates
      }
    }

    const handleConversationTransferred = async (payload: unknown) => {
      const data = payload as { conversationId: string }
      if (data.conversationId !== conversationId) return
      if (!isMounted) return
      try {
        const updated = await conversationService.getConversation(conversationId)
        if (!isMounted) return
        setConversation(updated)
        onConversationChange?.(updated)
      } catch {
        // ignore stale updates
      }
    }

    const handleConversationEscalated = async (payload: unknown) => {
      const data = payload as { conversationId: string }
      if (data.conversationId !== conversationId) return
      if (!isMounted) return
      try {
        const updated = await conversationService.getConversation(conversationId)
        if (!isMounted) return
        setConversation(updated)
        onConversationChange?.(updated)
      } catch {
        // ignore stale updates
      }
    }

    const handleConversationResolved = async (payload: unknown) => {
      const data = payload as { conversationId: string }
      if (data.conversationId !== conversationId) return
      if (!isMounted) return
      try {
        const updated = await conversationService.getConversation(conversationId)
        if (!isMounted) return
        setConversation(updated)
        onConversationChange?.(updated)
      } catch {
        // ignore stale updates
      }
    }

    const handleConversationClosed = async (payload: unknown) => {
      const data = payload as { conversationId: string }
      if (data.conversationId !== conversationId) return
      if (!isMounted) return
      try {
        const updated = await conversationService.getConversation(conversationId)
        if (!isMounted) return
        setConversation(updated)
        onConversationChange?.(updated)
      } catch {
        // ignore stale updates
      }
    }

    const handleConversationReopened = async (payload: unknown) => {
      const data = payload as { conversationId: string }
      if (data.conversationId !== conversationId) return
      if (!isMounted) return
      try {
        const updated = await conversationService.getConversation(conversationId)
        if (!isMounted) return
        setConversation(updated)
        onConversationChange?.(updated)
      } catch {
        // ignore stale updates
      }
    }

    const handleTyping = (payload: unknown) => {
      const data = payload as { conversationId: string; userId: string; status: 'start' | 'stop' }
      if (data.conversationId !== conversationId) return
      if (!isMounted) return
      setTypingUsers((current) => {
        if (data.status === 'start') {
          if (current.includes(data.userId)) return current
          return [...current, data.userId]
        }
        return current.filter((id) => id !== data.userId)
      })
    }

    const handleMessageDelivered = (payload: unknown) => {
      const data = payload as {
        conversationId: string
        messageId?: string
        deliveredBy?: string
        receipts?: Array<{ messageId: string; deliveredTo: string }>
      }
      if (data.conversationId !== conversationId) return
      setMessages((current) => current.map((message) => {
        if (data.messageId && message.id === data.messageId) {
          return { ...message, deliveredBy: data.deliveredBy }
        }
        if (data.receipts) {
          const receipt = data.receipts.find((receipt) => receipt.messageId === message.id)
          if (receipt) {
            return { ...message, deliveredBy: receipt.deliveredTo }
          }
        }
        return message
      }))
    }

    const handleMessageRead = (payload: unknown) => {
      const data = payload as { conversationId: string; messageId: string; readBy: string }
      if (data.conversationId !== conversationId) return
      setMessages((current) => current.map((message) => message.id === data.messageId ? { ...message, readBy: data.readBy } : message))
    }

    const handleConversationRead = (payload: unknown) => {
      const data = payload as { conversationId: string; readBy: string; count: number }
      if (data.conversationId !== conversationId) return
      if (!isMounted) return
      setConversation((current) => current ? { ...current, unreadCount: 0 } : current)
    }

    socketService.connect()
    socketService.joinConversation(conversationId).catch(() => {
      // ignore join failures until retries or page reload
    }).finally(() => {
      socketService.emit(SocketEvents.CONVERSATION_READ, { conversationId })
    })

    cleanupHandlers.push(socketService.on(SocketEvents.MESSAGE_CREATED, handleMessageCreated))
    cleanupHandlers.push(socketService.on(SocketEvents.CONVERSATION_ASSIGNED, handleConversationAssigned))
    cleanupHandlers.push(socketService.on(SocketEvents.CONVERSATION_TRANSFERRED, handleConversationTransferred))
    cleanupHandlers.push(socketService.on(SocketEvents.CONVERSATION_ESCALATED, handleConversationEscalated))
    cleanupHandlers.push(socketService.on(SocketEvents.CONVERSATION_RESOLVED, handleConversationResolved))
    cleanupHandlers.push(socketService.on(SocketEvents.CONVERSATION_CLOSED, handleConversationClosed))
    cleanupHandlers.push(socketService.on(SocketEvents.CONVERSATION_REOPENED, handleConversationReopened))
    cleanupHandlers.push(socketService.on(SocketEvents.TYPING, handleTyping))
    cleanupHandlers.push(socketService.on(SocketEvents.MESSAGE_DELIVERED, handleMessageDelivered))
    cleanupHandlers.push(socketService.on(SocketEvents.MESSAGE_READ, handleMessageRead))
    cleanupHandlers.push(socketService.on(SocketEvents.CONVERSATION_READ, handleConversationRead))

    return () => {
      isMounted = false
      cleanupHandlers.forEach((cleanup) => cleanup())
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
      socketService.leaveConversation(conversationId).catch(() => {
        // ignore leave failures on unmount
      })
    }
  }, [conversationId, onConversationChange, acknowledgeMessageDelivery, acknowledgeMessageRead, user?.id])

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    shouldScrollToBottomRef.current = false
  }, [messages])

  const canCompose = Boolean(
    conversation &&
    conversation.state !== CONVERSATION_STATUS.CLOSED &&
    conversation.state !== CONVERSATION_STATUS.ARCHIVED
  )

  const handleSend = async () => {
    if (!canCompose || !text.trim() || !conversationId) return
    setSending(true)
    setError(null)
    try {
      await messageService.createMessage({ conversationId, content: text })
      setText('')
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      await socketService.sendTyping(conversationId, 'stop')
      const msgs = await messageService.getMessages(conversationId)
      setMessages(sortMessagesChronologically(msgs))
      shouldScrollToBottomRef.current = true
      const updated = await conversationService.getConversation(conversationId)
      setConversation(updated)
      onConversationChange?.(updated)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send message'))
    } finally {
      setSending(false)
    }
  }

  const updateState = async (action: 'resolve' | 'close' | 'reopen') => {
    if (!conversationId) return
    setLoading(true)
    setError(null)
    try {
      let updated
      if (action === 'resolve') {
        updated = await conversationService.resolveConversation(conversationId)
      } else if (action === 'close') {
        updated = await conversationService.closeConversation(conversationId)
      } else {
        updated = await conversationService.reopenConversation(conversationId)
      }
      setConversation(updated)
      onConversationChange?.(updated)
      onActionComplete?.()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update conversation'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="conversation-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Conversation</h2>
          {conversation && (
            <p className="page-copy">ID: {conversation.id}</p>
          )}
        </div>
      </div>

      {loading && (
        <div className="panel-body"><Spinner /></div>
      )}

      {error && <div className="error-message">{error}</div>}

      {conversation && (
        <div className="panel-body">
          <div className="conversation-detail-header">
            <div>
              <p className="conversation-item-meta"><strong>Status:</strong> {conversation.state ?? 'OPEN'}</p>
              {conversation.queueState && <p className="conversation-item-meta"><strong>Queue state:</strong> {conversation.queueState}</p>}
              {conversation.owner && (
                <p className="conversation-item-meta">
                  <strong>Owner:</strong> {conversation.owner.id === user?.id ? 'You' : conversation.owner.username}
                </p>
              )}
              {conversation.participants?.length ? (
                <p className="conversation-item-meta"><strong>Participants:</strong> {conversation.participants.map((p) => p.user.username).join(', ')}</p>
              ) : null}
              <p className="conversation-item-meta"><strong>Last updated:</strong> {formatTimestamp(conversation.lastMessageAt ?? conversation.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="conversation-detail-body">
        {!loading && messages.length === 0 && <EmptyState title="No messages yet" subtitle="Start the conversation by sending a message." />}
        {messages.map((m) => {
          const isOwnMessage = user?.id === m.senderId
          const senderLabel = isOwnMessage ? 'You' : m.sender?.username ?? 'Unknown sender'
          return (
            <div key={m.id} className={`conversation-message ${isOwnMessage ? 'conversation-message-own' : 'conversation-message-other'}`}>
              <div className="conversation-message-header">{senderLabel} • {formatTimestamp(m.createdAt)}</div>
              <div className="conversation-message-content">{m.content}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="conversation-typing-indicator">
          <p className="page-copy">{typingUsers.length === 1 ? 'Someone is typing...' : 'Multiple people are typing...'}</p>
        </div>
      )}

      {conversation && (
        <div className="conversation-detail-actions">
          {conversation.state === CONVERSATION_STATUS.OPEN && (
            <Button variant="secondary" onClick={() => updateState('resolve')}>Resolve</Button>
          )}
          {conversation.state === CONVERSATION_STATUS.PENDING && (
            <Button variant="secondary" onClick={() => updateState('close')}>Close</Button>
          )}
          {conversation.state === CONVERSATION_STATUS.CLOSED && (
            <Button variant="primary" onClick={() => updateState('reopen')}>Reopen</Button>
          )}
        </div>
      )}

      <div className="textarea-row">
        <textarea
          value={text}
          onChange={(e) => {
            const value = e.target.value
            setText(value)
            if (!conversationId) return
            socketService.sendTyping(conversationId, 'start').catch(() => {})
            if (typingTimeoutRef.current) {
              window.clearTimeout(typingTimeoutRef.current)
            }
            typingTimeoutRef.current = window.setTimeout(() => {
              socketService.sendTyping(conversationId, 'stop').catch(() => {})
              typingTimeoutRef.current = null
            }, 1000)
          }}
          rows={3}
          className="textarea-field"
          disabled={!canCompose || sending}
        />
        <div className="textarea-actions">
          <Button variant="secondary" onClick={() => setText('')} disabled={sending}>
            Clear
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={!canCompose || sending || !text.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
      {!canCompose && conversation && (
        <p className="page-copy">This conversation is closed and cannot accept new messages.</p>
      )}
    </div>
  )
}
