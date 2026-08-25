import dotenv from 'dotenv'
dotenv.config()

export const SocketConfig = {
  path: process.env.SOCKET_PATH || '/socket.io',
  pingInterval: Number(process.env.SOCKET_PING_INTERVAL || 26000),
  pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT || 60000),
  reconnectionAttempts: Number(process.env.SOCKET_RECONNECT_ATTEMPTS || 5),
  redis: {
    url: process.env.REDIS_URL || undefined,
  },
}

export default SocketConfig
