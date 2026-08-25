import type { AppSocket } from './types'

export class ConnectionManager {
  private userToSockets = new Map<string, Set<string>>()

  add(userId: string, socketId: string) {
    const set = this.userToSockets.get(userId) || new Set<string>()
    set.add(socketId)
    this.userToSockets.set(userId, set)
  }

  remove(userId: string, socketId: string) {
    const set = this.userToSockets.get(userId)
    if (!set) return
    set.delete(socketId)
    if (set.size === 0) this.userToSockets.delete(userId)
  }

  list(userId: string) {
    return Array.from(this.userToSockets.get(userId) || [])
  }

  has(userId: string) {
    return (this.userToSockets.get(userId) || new Set()).size > 0
  }
}

export const connectionManager = new ConnectionManager()
