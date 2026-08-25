import React, { useEffect, useState, useRef } from 'react'
import type { User } from '../types/user'
import userService from '../services/user.service'
import ConversationList from '../features/customer/ConversationList'
import ConversationDetail from '../features/customer/ConversationDetail'
import UserForm from '../features/admin/UserForm'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { ROUTES } from '../config/routes'
import { ROLES } from '../constants/roles'

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createFormRef = useRef<HTMLFormElement | null>(null)
  const editFormRef = useRef<HTMLFormElement | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await userService.getUsers()
      setUsers(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingUser(null)
    setShowCreateModal(true)
  }

  const handleOpenEdit = (user: User) => {
    setEditingUser(user)
    setShowEditModal(true)
    setSelectedUser(user)
  }

  const handleCreateUser = async (payload: { username: string; email: string; password: string; role: string; companyId?: string; isActive?: boolean }) => {
    setActionLoading(true)
    try {
      await userService.createUser(payload)
      setShowCreateModal(false)
      void loadUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateUser = async (userId: string, payload: { username?: string; email?: string; password?: string; role?: string; companyId?: string; isActive?: boolean }) => {
    setActionLoading(true)
    try {
      await userService.updateUser(userId, payload)
      setShowEditModal(false)
      // refresh list and keep selection expanded
      await loadUsers()
      const updated = (await userService.getUsers()).find((u) => u.id === userId) ?? null
      setSelectedUser(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    setActionLoading(true)
    try {
      await userService.updateUser(user.id, { isActive: !user.isActive })
      await loadUsers()
      const updated = (await userService.getUsers()).find((u) => u.id === user.id) ?? null
      setSelectedUser(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update user status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      await userService.deleteUser(selectedUser.id)
      setShowDeleteConfirm(false)
      await loadUsers()
      setSelectedUser(null)
      setToastMessage('User deleted')
      window.setTimeout(() => setToastMessage(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers()
  }, [])

  return (
    <div className="page-shell">
      {toastMessage && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          <div className="toast">{toastMessage}</div>
        </div>
      )}
      <div className="page-header">
        <div className="page-header-left">
          <p className="eyebrow">Admin dashboard</p>
          <h1 className="page-title">User management and reporting</h1>
          <p className="page-copy">Review accounts, inspect active conversations, and manage platform health from one polished workspace.</p>
        </div>
        <div className="panel-actions">
          <Button variant="secondary" onClick={loadUsers} disabled={loading}>Refresh users</Button>
          <Button variant="primary" onClick={handleOpenCreate}>Create user</Button>
        </div>
      </div>

      {loading && (
        <div className="panel-body"><Spinner /></div>
      )}
      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Users</h2>
            <Badge>{users.length}</Badge>
          </div>

          {users.length === 0 ? (
            <EmptyState title="No users found" subtitle="There are no users to manage yet." />
          ) : (
            <div className="panel-body">
              <div className="table-responsive">
                <table className="user-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Username</th>
                      <th style={{ textAlign: 'left' }}>Email</th>
                      <th style={{ textAlign: 'left' }}>Role</th>
                      <th style={{ textAlign: 'left' }}>Status</th>
                      <th style={{ width: 160, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={`user-row ${selectedUser?.id === user.id ? 'selected' : ''}`}
                        onClick={() => setSelectedUser(user)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</td>
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</td>
                        <td style={{ width: 140 }}>{user.role ?? 'Unknown'}</td>
                        <td style={{ width: 120 }}>{user.isActive ? 'Active' : 'Disabled'}</td>
                        <td style={{ textAlign: 'right', width: 200 }}>
                          <div className="user-actions" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                            <Button variant="secondary" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleOpenEdit(user) }}>Edit</Button>
                            <Button variant="secondary" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleToggleActive(user) }} disabled={actionLoading}>
                              {user.isActive ? 'Disable' : 'Enable'}
                            </Button>
                            <Button variant="danger" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setSelectedUser(user); setShowDeleteConfirm(true) }} disabled={actionLoading} style={{ marginLeft: 12 }}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* User details panel (separate card below table) */}
        <section className="panel" style={{ marginTop: 12 }}>
          <div className="panel-header">
            <h2 className="panel-title">User details</h2>
          </div>
          <div className="panel-body">
            {selectedUser ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{selectedUser.username}</div>
                    <div style={{ color: 'var(--color-muted)' }}>{selectedUser.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{selectedUser.id}</div>
                    <div style={{ marginTop: 6 }} className="user-role">{selectedUser.role}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div>
                    <div className="conversation-item-meta">Status</div>
                    <div>{selectedUser.isActive ? 'Active' : 'Disabled'}</div>
                  </div>
                  <div>
                    <div className="conversation-item-meta">Created</div>
                    <div>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '-'}</div>
                  </div>
                  <div>
                    <div className="conversation-item-meta">Company</div>
                    <div>{selectedUser.companyId ?? '-'}</div>
                  </div>
                  <div>
                    <div className="conversation-item-meta">Role</div>
                    <div>{selectedUser.role ?? '-'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setSelectedUser(null)}>Clear</Button>
                  <Button variant="secondary" onClick={() => handleOpenEdit(selectedUser)}>Edit</Button>
                  <Button variant="secondary" onClick={() => handleToggleActive(selectedUser)} disabled={actionLoading}>{selectedUser.isActive ? 'Disable' : 'Enable'}</Button>
                  <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} disabled={actionLoading}>Delete</Button>
                </div>
              </div>
            ) : (
              <EmptyState title="Select a user" subtitle="Click a user in the list to inspect details and take actions." />
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Your conversations</h2>
            <Badge>Active</Badge>
          </div>
          <ConversationList
            limit={10}
            onSelect={(conversation) => setSelectedConversationId(conversation.id)}
            activeConversationId={selectedConversationId}
            linkBasePath={ROUTES.adminConversations}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Conversation detail</h2>
          </div>
          {selectedConversationId ? (
            <ConversationDetail conversationId={selectedConversationId} />
          ) : (
            <EmptyState title="Select a conversation" subtitle="Choose a conversation to inspect details and manage status." />
          )}
        </section>
      </div>

      {showCreateModal && (
        <Modal title="Create user" onClose={() => setShowCreateModal(false)} width={800} footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="primary" type="button" onClick={() => {
              if (createFormRef.current) {
                const form = createFormRef.current as HTMLFormElement
                if (typeof form.requestSubmit === 'function') {
                  form.requestSubmit()
                } else {
                  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
                }
              }
            }} disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Create user'}</Button>
          </div>
        )}>
          <UserForm
            ref={createFormRef}
            submitLabel="Create user"
            onCancel={() => setShowCreateModal(false)}
            onSubmit={handleCreateUser}
            loading={actionLoading}
            showFooter={false}
          />
        </Modal>
      )}

      {showEditModal && editingUser && (
        <Modal title="Edit user" onClose={() => setShowEditModal(false)} width={800} footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="primary" type="button" onClick={() => {
              if (editFormRef.current) {
                const form = editFormRef.current as HTMLFormElement
                if (typeof form.requestSubmit === 'function') {
                  form.requestSubmit()
                } else {
                  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
                }
              }
            }} disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save changes'}</Button>
          </div>
        )}>
          <UserForm
            ref={editFormRef}
            initialValues={{
              username: editingUser.username,
              email: editingUser.email,
              role: editingUser.role ?? ROLES.CUSTOMER,
              companyId: editingUser.companyId,
              isActive: editingUser.isActive,
            }}
            submitLabel="Save changes"
            onCancel={() => setShowEditModal(false)}
            onSubmit={(payload) => handleUpdateUser(editingUser.id, payload)}
            loading={actionLoading}
            showFooter={false}
          />
        </Modal>
      )}

      {showDeleteConfirm && selectedUser && (
        <Modal title="Confirm delete" onClose={() => setShowDeleteConfirm(false)} width={480}>
          <ConfirmDialog
            title="Delete User"
            message={`Are you sure you want to delete "${selectedUser.username}"? This action cannot be undone.`}
            onConfirm={handleDeleteUser}
            onCancel={() => setShowDeleteConfirm(false)}
            danger
          />
        </Modal>
      )}
    </div>
  )
}
