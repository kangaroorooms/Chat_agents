import api from '../api/axios'
import type { User } from '../types/user'

class UserService {
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/users')
    return response.data
  }

  async listUsers(opts?: { search?: string; cursor?: string; limit?: number }): Promise<{ items: User[]; pagination: { nextCursor: string | null } | null }> {
    const response = await api.get('/users', { params: opts })
    const payload = response.data
    return {
      items: Array.isArray(payload) ? payload : payload?.data ?? [],
      pagination: payload?.pagination ?? null,
    }
  }

  async getUser(userId: string): Promise<User> {
    const response = await api.get<User>(`/users/${userId}`)
    return response.data
  }

  async createUser(payload: { username: string; email: string; password: string; role: string; companyId?: string; isActive?: boolean }): Promise<User> {
    const response = await api.post<User>('/users', payload)
    return response.data
  }

  async updateUser(userId: string, payload: { username?: string; email?: string; password?: string; role?: string; companyId?: string; isActive?: boolean }): Promise<User> {
    const response = await api.patch<User>(`/users/${userId}`, payload)
    return response.data
  }

  async deleteUser(userId: string): Promise<{ success: true }> {
    const response = await api.delete<{ success: true }>(`/users/${userId}`)
    return response.data
  }

  async searchAgents(opts?: { search?: string; cursor?: string; limit?: number }): Promise<{ items: User[]; nextCursor: string | null }> {
    const response = await api.get('/users/agents', { params: opts })
    const payload = response.data
    return {
      items: (payload?.data ?? payload) as User[],
      nextCursor: payload?.pagination?.nextCursor ?? null,
    }
  }
}

export default new UserService()