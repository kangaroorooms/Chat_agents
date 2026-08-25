import { SocketConfig } from './config'

let adapter: any = null

export function initRedisAdapter() {
  const url = SocketConfig.redis.url
  if (!url) return null
  // lazy require to avoid compile-time dependency on ioredis/socket.io-redis
  // adapters; the runtime environment should have these installed when needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const IORedis = require('ioredis')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const createAdapter = require('socket.io-redis').createAdapter
  const pubClient = new IORedis(url)
  const subClient = pubClient.duplicate()
  adapter = createAdapter({ pubClient, subClient })
  return adapter
}

export function getAdapter() {
  return adapter
}
