export function makeConversation(overrides: Partial<any> = {}) {
  return Object.assign({
    id: 'conv-1',
    title: 'Test Conversation',
    createdAt: new Date(),
    updatedAt: new Date(),
  }, overrides)
}
