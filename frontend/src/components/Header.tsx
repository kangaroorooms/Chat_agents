import { useAuth } from '../context/AuthContext'
import Button from './ui/Button'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-mark" aria-hidden="true">✦</div>
        <div className="brand-copy">
          <p className="brand-name">AI Support</p>
          <p className="brand-subtitle">Customer service workspace</p>
        </div>
      </div>
      <div className="header-right">
        {user ? (
          <div className="user-info-header">
            <div className="user-details">
              <p className="user-name">{user.username}</p>
              <p className="user-role">{user.role}</p>
            </div>
            <Button variant="secondary" onClick={logout} aria-label="Log out of your account">
              Log out
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
