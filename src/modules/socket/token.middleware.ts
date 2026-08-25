import TokenService from '../../modules/auth/token.service'
import { AppSocket, UserPayload } from './types'

export async function socketAuthMiddleware(socket: AppSocket, next: (err?: any) => void) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.toString().replace(/^Bearer\s+/i, '')
    if (!token) return next(new Error('Authentication error'))
    const payload = TokenService.verify<UserPayload>(token)
    socket.data.user = payload
    return next()
  } catch (err) {
    return next(new Error('Authentication error'))
  }
}
