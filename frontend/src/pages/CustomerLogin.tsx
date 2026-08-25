import LoginForm from '../components/LoginForm'
import { ROUTES } from '../config/routes'
import { ROLES } from '../constants/roles'

export default function CustomerLogin() {
  return (
    <LoginForm
      portalName="Customer Portal"
      allowedRoles={[ROLES.CUSTOMER]}
      redirectTo={ROUTES.customerDashboard}
      registerPath={ROUTES.customerRegister}
    />
  )
}
