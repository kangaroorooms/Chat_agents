import { useMutation, useQuery } from '@tanstack/react-query'
import { settingsApi } from './settings-api'
import { Panel, QueryState, SettingsShell } from './SettingsShell'

type Metric = { metricType: string; quantity: number; limit: number; percentage: number | null }
type Overview = {
  subscription?: { plan?: { name: string } }
  usage: { metrics: Metric[] }
  recentInvoices: Array<{ id: string; amountDue: number; currency: string; status: string; hostedInvoiceUrl?: string }>
}

export default function BillingSettings() {
  const overview = useQuery({
    queryKey: ['billing-overview'],
    queryFn: () => settingsApi.get<Overview>('/billing/overview'),
  })

  const portal = useMutation({
    mutationFn: () => settingsApi.post<{ url: string }>('/billing/customer-portal', { returnUrl: window.location.href }),
    onSuccess: (data) => window.location.assign(data.url),
  })

  return (
    <SettingsShell title="Billing and usage">
      <QueryState loading={overview.isLoading} error={overview.error}>
        <Panel
          title="Current plan"
          actions={<button className="btn-secondary" onClick={() => portal.mutate()} disabled={portal.isPending}>Manage billing</button>}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-bold">{overview.data?.subscription?.plan?.name ?? 'No active plan'}</p>
              <p className="text-sm text-slate-500">Usage resets at the end of the billing period.</p>
            </div>
            <a className="btn-primary" href="mailto:sales@example.com?subject=Plan%20upgrade">Upgrade plan</a>
          </div>
        </Panel>

        <Panel title="Usage and limits">
          <div className="grid gap-4 md:grid-cols-2">
            {overview.data?.usage.metrics.map((metric) => (
              <div key={metric.metricType} className="rounded-lg border border-slate-200 p-4">
                <div className="flex justify-between text-sm">
                  <span>{metric.metricType.replace(/_/g, ' ')}</span>
                  <strong>
                    {metric.quantity} / {metric.limit < 0 ? 'Unlimited' : metric.limit}
                  </strong>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
                  <div
                    className={`h-full ${metric.percentage !== null && metric.percentage >= 95 ? 'bg-red-500' : 'bg-brand-500'}`}
                    style={{ width: `${metric.percentage ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Invoices">
          <div className="space-y-2">
            {overview.data?.recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <span>
                  {invoice.status} · {(invoice.amountDue / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                </span>
                {invoice.hostedInvoiceUrl && (
                  <a className="text-brand-600" href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                    View invoice
                  </a>
                )}
              </div>
            )) ?? <p className="text-sm text-slate-500">No invoices available.</p>}
          </div>
        </Panel>
      </QueryState>
    </SettingsShell>
  )
}

