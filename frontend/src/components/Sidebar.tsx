import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../config/routes'
import { ROLES } from '../constants/roles'

export default function Sidebar() {
  const { user } = useAuth()

  return (
    <div className="sidebar-panel">
      <div className="sidebar-header-panel">
        <p className="sidebar-title">Workspace</p>
        <p className="sidebar-subtitle">Your support command center</p>
      </div>

      <nav className="sidebar-nav">
        <Link to={ROUTES.profile} className="sidebar-item">
          <span className="sidebar-item-icon" aria-hidden="true">◉</span><span>Profile</span>
        </Link>

        {user?.role === ROLES.CUSTOMER && (
          <Link to={ROUTES.customerDashboard} className="sidebar-item">
            <span className="sidebar-item-icon" aria-hidden="true">▤</span><span>My Conversations</span>
          </Link>
        )}

        {user?.role === ROLES.AGENT && (
          <Link to={ROUTES.agentDashboard} className="sidebar-item">
            <span className="sidebar-item-icon" aria-hidden="true">◈</span><span>Agent Dashboard</span>
          </Link>
        )}

        {(user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN) && (
          <>
            <Link to={ROUTES.adminDashboard} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">⌘</span><span>Admin Dashboard</span>
            </Link>
            <Link to={ROUTES.settingsCompany} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">⚙</span><span>Company Settings</span>
            </Link>
            <Link to={ROUTES.settingsUsers} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">👥</span><span>User Management</span>
            </Link>
            <Link to={ROUTES.settingsAi} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">AI</span><span>AI Settings</span>
            </Link>
            <Link to={ROUTES.settingsKnowledge} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">KB</span><span>Knowledge Base</span>
            </Link>
            <Link to={ROUTES.settingsBilling} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">$</span><span>Billing</span>
            </Link>
            <Link to={ROUTES.settingsAnalytics} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">▣</span><span>Analytics</span>
            </Link>
            <Link to={ROUTES.settingsWebhooks} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">⎇</span><span>Webhooks</span>
            </Link>
            <Link to={ROUTES.settingsEmail} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">✉</span><span>Email Channels</span>
            </Link>
            <Link to={ROUTES.settingsApiKeys} className="sidebar-item">
              <span className="sidebar-item-icon" aria-hidden="true">🔑</span><span>API Keys</span>
            </Link>
          </>
        )}
      </nav>
      {user && <div className="sidebar-user"><div className="avatar avatar-small">{user.username.charAt(0).toUpperCase()}</div><div><strong>{user.username}</strong><span>{user.role}</span></div></div>}
    </div>
  )
}
