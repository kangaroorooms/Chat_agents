import LoginForm from '../components/LoginForm'
import { ROUTES } from '../config/routes'
import { ROLES } from '../constants/roles'

export default function AgentLogin() {
  return <LoginForm portalName="Agent Portal" allowedRoles={[ROLES.AGENT]} redirectTo={ROUTES.agentDashboard} />
}
