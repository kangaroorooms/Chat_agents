import api from '../api/axios'
import { STORAGE_KEYS } from '../constants/storage'
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types/auth'

class AuthService {
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/register', data)

    return response.data
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', data)

    return response.data
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.user)
  }
}

export default new AuthService()