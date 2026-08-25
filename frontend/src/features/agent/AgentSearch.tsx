import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/error'
import userService from '../../services/user.service'
import type { User } from '../../types/user'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

type Props = {
  selectedUserId?: string
  onSelect: (agent: User) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

export default function AgentSearch({ selectedUserId, onSelect, label = 'Search agents', placeholder = 'Search by name or email', disabled = false }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return
      setLoading(true)
      setError(null)
      userService.searchAgents({ search: query.trim() || undefined, limit: 20 })
        .then((result) => {
          if (active) setResults(result.items)
        })
        .catch((err) => {
          if (!active) return
          setError(getErrorMessage(err, 'Unable to search agents'))
          setResults([])
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="panel">
      <div className="panel-body">
        <div className="form-group">
          <label htmlFor="agent-search">{label}</label>
          <input
            id="agent-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="input-field"
            disabled={disabled}
            autoComplete="off"
          />
        </div>

        {loading && <Spinner />}
        {error && <div className="error-message">{error}</div>}
        {!loading && !error && results.length === 0 && query && (
          <EmptyState title="No matching agents" subtitle="Try a different name or email." />
        )}

        {!loading && !error && results.length > 0 && (
          <div className="agent-results" role="listbox" aria-label="Agent search results">
            {results.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`agent-result ${selectedUserId === agent.id ? 'selected' : ''}`}
                onClick={() => onSelect(agent)}
                disabled={disabled}
              >
                <span className="avatar avatar-small">{agent.username.charAt(0).toUpperCase()}</span>
                <span className="agent-result-copy">
                  <strong>{agent.username}</strong>
                  <span>{agent.email}</span>
                </span>
                <span aria-hidden="true">{selectedUserId === agent.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
