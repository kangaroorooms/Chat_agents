import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user } = useAuth()

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-header-left">
          <p className="eyebrow">Your profile</p>
          <h1 className="page-title">Account details</h1>
          <p className="page-copy">Review and manage your account details from a single polished workspace.</p>
        </div>
      </div>

      <div className="panel profile-card">
        <div className="panel-header">
          <h2 className="panel-title">Profile information</h2>
        </div>
        <div className="panel-body">
          {user ? (
            <div className="profile-content">
              <div className="avatar avatar-large">{user.username.charAt(0).toUpperCase()}</div>
              <div className="profile-identity"><h2>{user.username}</h2><p>{user.email}</p></div>
              <div className="profile-grid">
              <div className="profile-field">
                <p className="page-copy">Username</p>
                <p>{user.username}</p>
              </div>
              <div className="profile-field">
                <p className="page-copy">Email</p>
                <p>{user.email}</p>
              </div>
              <div className="profile-field">
                <p className="page-copy">Role</p>
                <p>{user.role}</p>
              </div>
              </div>
              <button type="button" className="btn btn-secondary" disabled>Edit profile</button>
            </div>
          ) : (
            <div className="empty-state">
              <p>No user available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
