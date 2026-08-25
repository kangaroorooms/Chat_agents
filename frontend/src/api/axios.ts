import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { STORAGE_KEYS } from '../constants/storage'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] || 'http://localhost:4000/api',
  timeout: 10000,
  withCredentials: true, // send cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
  config: AxiosRequestConfig
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error)
    } else {
        if (token) {
          p.config.headers = p.config.headers ?? {}
          ;(p.config.headers as Record<string, unknown>)['Authorization'] = `Bearer ${token}`
        }
        p.resolve(p.config)
    }
  })

  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest })
        })
          .then((cfg) => api(cfg as AxiosRequestConfig))
          .catch((err) => Promise.reject(err))
      }

      isRefreshing = true

      try {
        const refreshResp = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
        const newToken = refreshResp.data?.token

        if (newToken) {
          localStorage.setItem(STORAGE_KEYS.token, newToken)
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }

        processQueue(new Error('Refresh failed'), null)
        localStorage.removeItem(STORAGE_KEYS.token)
        localStorage.removeItem(STORAGE_KEYS.user)
        window.location.href = '/'
        return Promise.reject(error)
        } catch (err) {
        processQueue(err as unknown, null)
        localStorage.removeItem(STORAGE_KEYS.token)
        localStorage.removeItem(STORAGE_KEYS.user)
        window.location.href = '/'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api