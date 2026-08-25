import api from '../../api/axios'

export type ApiEnvelope<T> = { success: boolean; data: T; message?: string }
export const unwrap = <T>(response: { data: ApiEnvelope<T> | T }) => ('success' in (response.data as object) ? (response.data as ApiEnvelope<T>).data : response.data as T)
export const settingsApi = {
  get: async <T>(path: string) => unwrap<T>(await api.get(path)),
  post: async <T>(path: string, body?: unknown) => unwrap<T>(await api.post(path, body)),
  put: async <T>(path: string, body: unknown) => unwrap<T>(await api.put(path, body)),
  patch: async <T>(path: string, body: unknown) => unwrap<T>(await api.patch(path, body)),
  delete: (path: string) => api.delete(path),
}
