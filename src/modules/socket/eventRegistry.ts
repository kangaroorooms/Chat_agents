export const SocketEvents = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',

  TYPING: 'typing',
  MESSAGE_CREATE: 'message:create',
  MESSAGE_CREATED: 'message:created',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',

  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  CONVERSATION_READ: 'conversation:read',

  CONVERSATION_ASSIGN: 'conversation:assign',
  CONVERSATION_TRANSFER: 'conversation:transfer',
  CONVERSATION_ESCALATED: 'conversation:escalated',
  CONVERSATION_RESOLVED: 'conversation:resolved',
  CONVERSATION_CLOSED: 'conversation:closed',
  CONVERSATION_REOPENED: 'conversation:reopened',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_HANDOFF_AI: 'conversation:handoff:ai',
  CONVERSATION_HANDOFF_AGENT: 'conversation:handoff:agent',
  CONVERSATION_AI_SUGGESTED: 'conversation:ai:suggested',
  CONVERSATION_AI_SUMMARIZED: 'conversation:ai:summarized',
  CONVERSATION_AI_HANDOFF_REQUESTED: 'conversation:ai:handoff:requested',
  CONVERSATION_AI_REPLIED: 'conversation:ai:replied',

  AGENT_JOIN: 'agent:join',
  AGENT_JOINED: 'agent:joined',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  CONVERSATION_TRANSFERRED: 'conversation:transferred',
}

export default SocketEvents
