import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

import CustomerLogin from './pages/CustomerLogin'
import AgentLogin from './pages/AgentLogin'
import AdminLogin from './pages/AdminLogin'
import Landing from './pages/Landing'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import CustomerDashboard from './pages/CustomerDashboard'
import ConversationList from './features/customer/ConversationList'
import ConversationDetail from './features/customer/ConversationDetail'
import AgentDashboard from './pages/AgentDashboard'
import EnterpriseAdminDashboard from './pages/EnterpriseAdminDashboard'
import Profile from './pages/Profile'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound'
import AppLayout from './components/AppLayout'
import CompanySettings from './features/settings/CompanySettings'
import UserSettings from './features/settings/UserSettings'
import AiSettings from './features/settings/AiSettings'
import KnowledgeSettings from './features/settings/KnowledgeSettings'
import BillingSettings from './features/settings/BillingSettings'
import AnalyticsSettings from './features/settings/AnalyticsSettings'
import { WebhookSettings, EmailChannelSettings, ApiKeySettings } from './features/settings/IntegrationsSettings'
import { ROUTES } from './config/routes'
import { ROLES } from './constants/roles'

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path={ROUTES.home} element={<Landing />} />
          <Route path={ROUTES.customerLogin} element={<CustomerLogin />} />
          <Route path={ROUTES.customerRegister} element={<Register />} />
          <Route path={ROUTES.agentLogin} element={<AgentLogin />} />
          <Route path={ROUTES.adminLogin} element={<AdminLogin />} />

          {/* Protected role-based routes */}
          <Route path={ROUTES.customerDashboard} element={<ProtectedRoute roles={[ROLES.CUSTOMER]}><AppLayout><CustomerDashboard /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.customerConversations} element={<ProtectedRoute roles={[ROLES.CUSTOMER]}><AppLayout><ConversationList /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.customerConversationDetail} element={<ProtectedRoute roles={[ROLES.CUSTOMER]}><AppLayout><ConversationDetail /></AppLayout></ProtectedRoute>} />

          <Route
            path={ROUTES.agentDashboard}
            element={
              <ProtectedRoute roles={[ROLES.AGENT]}>
                <AppLayout>
                  <AgentDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.agentConversationDetail}
            element={
              <ProtectedRoute roles={[ROLES.AGENT]}>
                <AppLayout>
                  <AgentDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.adminDashboard}
            element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                <AppLayout>
                  <EnterpriseAdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path={ROUTES.settingsCompany} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><CompanySettings /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.settingsUsers} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><UserSettings /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.settingsAi} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><AiSettings /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.settingsKnowledge} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><KnowledgeSettings /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.settingsBilling} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><BillingSettings /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.settingsAnalytics} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><AnalyticsSettings /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.settingsWebhooks} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><WebhookSettings /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.settingsEmail} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><EmailChannelSettings /></AppLayout></ProtectedRoute>} />
          <Route path={ROUTES.settingsApiKeys} element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AppLayout><ApiKeySettings /></AppLayout></ProtectedRoute>} />

          <Route
            path={ROUTES.profile}
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path={ROUTES.unauthorized} element={<Unauthorized />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
