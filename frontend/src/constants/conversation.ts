export const CONVERSATION_STATUS = {
  OPEN: 'OPEN',
  PENDING: 'PENDING',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const

export type ConversationState = (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS]

export const PAGINATION = {
  defaultLimit: 10,
}
