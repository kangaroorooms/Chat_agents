import { Link } from 'react-router-dom'

import { ROUTES } from '../config/routes'

const portals = [
  {
    path: ROUTES.customerLogin,
    icon: '◉',
    title: 'Customer Portal',
    description: 'Get help, start conversations, and stay connected with your support team.',
    action: 'Continue as customer',
  },
  {
    path: ROUTES.agentLogin,
    icon: '◈',
    title: 'Support Agent Portal',
    description: 'Manage your queue, respond to customers, respond to customers, and keep support moving.',
    action: 'Continue as agent',
  },
  {
    path: ROUTES.adminLogin,
    icon: '⌘',
    title: 'Administrator Portal',
    description: 'Oversee users, conversations, and the health of your support workspace.',
    action: 'Continue as administrator',
  },
]

export default function Landing() {
  return (
    <main className="landing-page">
      <div className="landing-glow landing-glow-one" aria-hidden="true" />
      <div className="landing-glow landing-glow-two" aria-hidden="true" />

      <section className="landing-content" aria-labelledby="landing-title">
        <div className="landing-brand">
          <div className="brand-mark landing-brand-mark" aria-hidden="true">✦</div>
          <span>AI Support</span>
        </div>

        <div className="landing-intro">
          <p className="eyebrow">Welcome to your workspace</p>
          <h1 id="landing-title">Support that moves with you.</h1>
          <p>Choose the workspace that matches your role to get started.</p>
        </div>

        <div className="portal-grid">
          {portals.map((portal) => (
            <Link key={portal.path} to={portal.path} className="portal-card">
              <div className="portal-card-icon" aria-hidden="true">{portal.icon}</div>
              <div className="portal-card-copy">
                <h2>{portal.title}</h2>
                <p>{portal.description}</p>
              </div>
              <span className="portal-card-action">{portal.action}<span aria-hidden="true"> →</span></span>
            </Link>
          ))}
        </div>

        <p className="landing-footer">Secure access to your AI-powered support workspace.</p>
      </section>
    </main>
  )
}
