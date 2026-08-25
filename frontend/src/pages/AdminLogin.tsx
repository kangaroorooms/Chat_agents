import LoginForm from '../components/LoginForm'
import { ROUTES } from '../config/routes'
import { ROLES } from '../constants/roles'

export default function AdminLogin() {
  return <LoginForm portalName="Admin Portal" allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} redirectTo={ROUTES.adminDashboard} />
}
