import React, { useState, forwardRef } from 'react'
import Button from '../../components/ui/Button'
import { ROLES } from '../../constants/roles'

interface Props {
  initialValues?: {
    username: string
    email: string
    role: string
    companyId?: string
    isActive?: boolean
  }
  onSubmit: (payload: { username: string; email: string; password: string; role: string; companyId?: string; isActive?: boolean }) => void
  onCancel: () => void
  submitLabel: string
  loading?: boolean
  showFooter?: boolean
}

const UserForm = forwardRef<HTMLFormElement, Props>(function UserForm({ initialValues, onSubmit, onCancel, submitLabel, loading = false, showFooter = true }: Props, ref) {
  const [username, setUsername] = useState(initialValues?.username ?? '')
  const [email, setEmail] = useState(initialValues?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(initialValues?.role ?? ROLES.CUSTOMER)
  const [companyId, setCompanyId] = useState(initialValues?.companyId ?? '')
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)

  // NOTE: initialize state from `initialValues` on mount. Avoid updating
  // local state from props inside an effect to prevent cascading renders.

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Username is required.')
      return
    }

    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    if (!initialValues && !password.trim()) {
      setError('Password is required for new users.')
      return
    }

    if (!role) {
      setError('Role is required.')
      return
    }

    onSubmit({
      username: username.trim(),
      email: email.trim(),
      password: password.trim(),
      role,
      companyId: companyId.trim() || undefined,
      isActive,
    })
  }

  return (
    <form ref={ref} className="user-form modal-form" onSubmit={handleSubmit}>
      <div style={{ maxHeight: '60vh', overflow: 'auto', paddingRight: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
      <div className="form-group">
        <label htmlFor="user-username">Username</label>
        <input
          id="user-username"
          type="text"
          className="input-field"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="user-email">Email</label>
        <input
          id="user-email"
          type="email"
          className="input-field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="user-password">Password</label>
        <input
          id="user-password"
          type="password"
          className="input-field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          placeholder={initialValues ? 'Leave blank to keep existing password' : 'Enter a secure password'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="user-role">Role</label>
        <select
          id="user-role"
          className="input-field"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          disabled={loading}
        >
          {Object.values(ROLES).map((roleOption) => (
            <option key={roleOption} value={roleOption}>
              {roleOption}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="user-company">Company ID</label>
        <input
          id="user-company"
          type="text"
          className="input-field"
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
          disabled={loading}
          placeholder="Optional company ID"
        />
      </div>

      <div className="form-group form-group-inline" style={{ alignItems: 'center' }}>
        <label htmlFor="user-active">Account active</label>
        <input
          id="user-active"
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={loading}
        />
      </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {showFooter && (
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
          <Button variant="secondary" type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
})

export default UserForm
