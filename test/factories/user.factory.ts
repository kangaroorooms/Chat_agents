export function makeUser(overrides: Partial<any> = {}) {
  return Object.assign({
    id: 'user-1',
    username: 'tester',
    email: 'tester@example.com',
    createdAt: new Date(),
  }, overrides)
}
