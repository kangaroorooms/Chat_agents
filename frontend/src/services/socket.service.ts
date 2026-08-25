import { io, type Socket } from 'socket.io-client'
import { STORAGE_KEYS } from '../constants/storage'
import { SocketEvents } from './socket.events'

type MessageCreatePayload = { conversationId: string; content: string; type?: string; metadata?: unknown; replyToId?: string }
type MessageReceiptPayload = { messageId: string }
type EventHandler = (...args: unknown[]) => void

type SocketState = {
  socket: Socket | null
  connected: boolean
  currentConversationId: string | null
  joinedAgentId: string | null
  joinedCompanyId: string | null
}

const socketState: SocketState = {
  socket: null,
  connected: false,
  currentConversationId: null,
  joinedAgentId: null,
  joinedCompanyId: null,
}

const getToken = () => localStorage.getItem(STORAGE_KEYS.token)

const getBaseUrl = () => import.meta.env['VITE_API_URL']?.replace(/\/api$/, '') || 'http://localhost:4000'

const createSocket = () => {
  const token = getToken()
  const socket = io(getBaseUrl(), {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
  })

  socket.on('connect', () => {
    socketState.connected = true
    if (socketState.currentConversationId) {
      socket.emit(SocketEvents.ROOM_JOIN, { type: 'conversation', id: socketState.currentConversationId })
      socket.timeout(10000).emit('recover', { conversationIds: [socketState.currentConversationId] }, () => {
        // ignore recover response in client
      })
    }
    if (socketState.joinedAgentId) {
      socket.emit(SocketEvents.ROOM_JOIN, { type: 'agent', id: socketState.joinedAgentId })
    }
    if (socketState.joinedCompanyId) {
      socket.emit(SocketEvents.ROOM_JOIN, { type: 'company', id: socketState.joinedCompanyId })
    }
  })

  socket.on('disconnect', () => {
    socketState.connected = false
  })

  return socket
}

const ensureSocket = () => {
  if (!socketState.socket) {
    socketState.socket = createSocket()
  }
  return socketState.socket
}

const connect = () => {
  const socket = ensureSocket()
  if (!socket.connected) {
    socket.connect()
  }
  return socket
}

const disconnect = () => {
  if (socketState.socket) {
    socketState.socket.disconnect()
    socketState.socket.removeAllListeners()
    socketState.socket = null
    socketState.connected = false
    socketState.currentConversationId = null
    socketState.joinedAgentId = null
    socketState.joinedCompanyId = null
  }
}

const joinConversation = async (conversationId: string) => {
  const socket = connect()
  if (socketState.currentConversationId === conversationId) return

  if (socketState.currentConversationId) {
    await socket.emit(SocketEvents.ROOM_LEAVE, { type: 'conversation', id: socketState.currentConversationId })
  }

  await socket.emit(SocketEvents.ROOM_JOIN, { type: 'conversation', id: conversationId })
  socketState.currentConversationId = conversationId
}

const leaveConversation = async (conversationId: string) => {
  const socket = ensureSocket()
  if (!socketState.currentConversationId || socketState.currentConversationId !== conversationId) return
  await socket.emit(SocketEvents.ROOM_LEAVE, { type: 'conversation', id: conversationId })
  socketState.currentConversationId = null
}

const joinAgentRoom = async (agentId: string) => {
  const socket = connect()
  if (socketState.joinedAgentId === agentId) return
  if (socketState.joinedAgentId) {
    await socket.emit(SocketEvents.ROOM_LEAVE, { type: 'agent', id: socketState.joinedAgentId })
  }
  await socket.emit(SocketEvents.ROOM_JOIN, { type: 'agent', id: agentId })
  socketState.joinedAgentId = agentId
}

const joinCompanyRoom = async (companyId: string) => {
  const socket = connect()
  if (socketState.joinedCompanyId === companyId) return
  if (socketState.joinedCompanyId) {
    await socket.emit(SocketEvents.ROOM_LEAVE, { type: 'company', id: socketState.joinedCompanyId })
  }
  await socket.emit(SocketEvents.ROOM_JOIN, { type: 'company', id: companyId })
  socketState.joinedCompanyId = companyId
}

const leaveAgentRoom = async () => {
  const socket = ensureSocket()
  if (!socketState.joinedAgentId) return
  await socket.emit(SocketEvents.ROOM_LEAVE, { type: 'agent', id: socketState.joinedAgentId })
  socketState.joinedAgentId = null
}

const leaveCompanyRoom = async () => {
  const socket = ensureSocket()
  if (!socketState.joinedCompanyId) return
  await socket.emit(SocketEvents.ROOM_LEAVE, { type: 'company', id: socketState.joinedCompanyId })
  socketState.joinedCompanyId = null
}

const sendTyping = async (conversationId: string, status: 'start' | 'stop') => {
  const socket = connect()
  const payload = { conversationId, status }
  await socket.emit(SocketEvents.TYPING, payload)
}

const sendMessageDelivered = async (messageId: string) => {
  const socket = connect()
  const payload: MessageReceiptPayload = { messageId }
  await socket.emit(SocketEvents.MESSAGE_DELIVERED, payload)
}

const sendMessageRead = async (messageId: string) => {
  const socket = connect()
  const payload: MessageReceiptPayload = { messageId }
  await socket.emit(SocketEvents.MESSAGE_READ, payload)
}

const createMessage = async (payload: MessageCreatePayload) => {
  const socket = connect()
  return new Promise<unknown>((resolve, reject) => {
    socket.timeout(10000).emit(SocketEvents.MESSAGE_CREATE, payload, (err: unknown, data: unknown) => {
      if (err) return reject(err)
      return resolve(data)
    })
  })
}

const recover = async (conversationIds: string[] = []) => {
  const socket = connect()
  const payload = { conversationIds }
  return new Promise<unknown>((resolve, reject) => {
    socket.timeout(10000).emit('recover', payload, (err: unknown, data: unknown) => {
      if (err) return reject(err)
      return resolve(data)
    })
  })
}

const on = (event: string, listener: (...args: unknown[]) => void) => {
  const socket = ensureSocket()
  socket.on(event, listener)
  return () => socket.off(event, listener)
}

const off = (event: string, listener: EventHandler) => {
  const socket = socketState.socket
  if (!socket) return
  socket.off(event, listener)
}

const emit = <T>(event: string, payload: T) => {
  const socket = connect()
  socket.emit(event, payload)
}

export default {
  connect,
  disconnect,
  joinConversation,
  leaveConversation,
  joinAgentRoom,
  leaveAgentRoom,
  joinCompanyRoom,
  leaveCompanyRoom,
  sendTyping,
  sendMessageDelivered,
  sendMessageRead,
  createMessage,
  recover,
  on,
  off,
  emit,
  get connected() {
    return socketState.connected
  },
  get currentConversationId() {
    return socketState.currentConversationId
  },
}
