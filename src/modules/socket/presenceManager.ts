import { connectionManager } from './connectionManager'

export class PresenceManager {
  isOnline(userId: string) {
    return connectionManager.has(userId)
  }

  listOnlineUsers() {
    // simple in-memory list
    // For horizontal scaling use Redis set
    // We present API here and leave adapter to redis adapter
    return [] as string[]
  }
}

export const presenceManager = new PresenceManager()
