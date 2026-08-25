import bcrypt from 'bcrypt'
import AuthConfig from '../../config/auth'

class PasswordService {
  async hash(password: string) {
    return bcrypt.hash(password, AuthConfig.auth.saltRounds)
  }

  async compare(password: string, hash: string) {
    return bcrypt.compare(password, hash)
  }
}

export default new PasswordService()
