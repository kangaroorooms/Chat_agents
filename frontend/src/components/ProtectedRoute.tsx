import { Navigate, useLocation } from 'react-router-dom'
import React from 'react'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../config/routes'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps): React.ReactElement {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div>Loading...</div>

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  if (roles && roles.length > 0) {
    const has = user.role && roles.indexOf(user.role) !== -1
    if (!has) return <Navigate to={ROUTES.unauthorized} replace />
  }

  return <>{children}</>
}