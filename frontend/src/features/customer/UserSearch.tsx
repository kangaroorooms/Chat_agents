import { useEffect, useState } from 'react'
import userService from '../../services/user.service'
import type { User } from '../../types/user'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

type Props = {
  query?: string
  onSelect: (user: User) => void
}

export default function UserSearch({ query = '', onSelect }: Props) {
  const [q, setQ] = useState(query)
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q) {
        setResults([])
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      userService.getUsers()
        .then((items) => {
          const filtered = items.filter((u) => (u.username ?? '').toLowerCase().includes(q.toLowerCase()) || (u.email ?? '').toLowerCase().includes(q.toLowerCase()))
          setResults(filtered)
        })
        .catch((err) => {
          // show friendly message; search may be restricted by backend
          setError(err?.response?.data?.message ?? err?.message ?? 'User search unavailable')
          setResults([])
        })
        .finally(() => setLoading(false))
    }, 500)

    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="panel">
      <div className="panel-body">
        <div className="form-group">
          <label htmlFor="user-search">Search support users</label>
          <input
            id="user-search"
            placeholder="Search by name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input-field"
          />
        </div>

        {loading && <Spinner />}
        {error && <div className="error-message">{error}</div>}
        {!loading && !error && results.length === 0 && q && (
          <EmptyState title="No users found" subtitle="Try a different name or email" />
        )}

        {!loading && results.length > 0 && (
          <ul className="user-search-list">
            {results.map((u) => (
              <li key={u.id} className="user-search-item" onClick={() => onSelect(u)}>
                <div className="user-search-name">{u.username}</div>
                <div className="user-search-email">{u.email}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
