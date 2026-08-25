import { useState } from 'react'
import { AxiosError } from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../constants/roles'

type ErrorResponse = { message: string }

type Props = {
  portalName: string
  allowedRoles: Role[]
  redirectTo: string
  registerPath?: string
}

function getLoginError(error: unknown) {
  const axiosError = error as AxiosError<ErrorResponse>
  return axiosError.response?.data?.message || axiosError.message || 'Login failed. Please try again.'
}

export default function LoginForm({ portalName, allowedRoles, redirectTo, registerPath }: Props) {
  const navigate = useNavigate()
  const { login, logout, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const validateForm = () => {
    if (!email.trim()) return setError('Email is required'), false
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address'), false
    if (!password) return setError('Password is required'), false
    if (password.length < 6) return setError('Password must be at least 6 characters'), false
    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!validateForm()) return

    try {
      const authenticatedUser = await login({ email, password })
      const authenticatedRole = authenticatedUser.role as Role | undefined
      if (!authenticatedRole || !allowedRoles.includes(authenticatedRole)) {
        logout()
        setError(`This account is not authorized for the ${portalName}.`)
        return
      }
      navigate(redirectTo)
    } catch (loginError: unknown) {
      setError(getLoginError(loginError))
    }
  }

  const clearError = () => {
    if (error) setError('')
  }

  return (
    <div className="container-page">
      <div className="card">
        <div className="auth-header">
          <h1>{portalName}</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message" role="alert">{error}</div>}

          <div className="form-group">
            <label htmlFor={`${portalName}-email`}>Email Address</label>
            <input
              id={`${portalName}-email`}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => { setEmail(event.target.value); clearError() }}
              disabled={loading}
              autoComplete="email"
              className={error ? 'input-error' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor={`${portalName}-password`}>Password</label>
            <div className="password-input-wrapper">
              <input
                id={`${portalName}-password`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); clearError() }}
                disabled={loading}
                autoComplete="current-password"
                className={error ? 'input-error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        {registerPath && (
          <div className="auth-footer">
            <p>Don't have an account? <Link to={registerPath} className="auth-link">Create one here</Link></p>
          </div>
        )}
      </div>
    </div>
  )
}
