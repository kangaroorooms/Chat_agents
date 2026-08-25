import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../config/routes'

const links = [
  ['Company', ROUTES.settingsCompany], ['Users', ROUTES.settingsUsers], ['AI', ROUTES.settingsAi], ['Knowledge base', ROUTES.settingsKnowledge], ['Billing', ROUTES.settingsBilling], ['Analytics', ROUTES.settingsAnalytics], ['Webhooks', ROUTES.settingsWebhooks], ['Email channels', ROUTES.settingsEmail], ['API keys', ROUTES.settingsApiKeys],
]
export function SettingsShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { user } = useAuth()
  return <div className="mx-auto max-w-7xl p-4 md:p-8"><div className="mb-8"><p className="text-sm font-medium text-brand-600">Enterprise workspace</p><h1 className="text-3xl font-bold text-slate-900">{title}</h1></div><div className="grid gap-8 lg:grid-cols-[220px_1fr]"><aside className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3"><p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Settings</p><nav className="flex gap-1 lg:flex-col">{links.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-semibold text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</NavLink>)}</nav><p className="mt-4 px-3 text-xs text-slate-500">Signed in as {user?.role}</p></aside><main>{children}</main></div></div>
}
export function Panel({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) { return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2>{actions}</div>{children}</section> }
export function QueryState({ loading, error, children }: { loading: boolean; error?: unknown; children: React.ReactNode }) { if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading workspace data…</div>; if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load this section. Refresh and try again.</div>; return <>{children}</> }
