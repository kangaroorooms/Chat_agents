import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { settingsApi } from './settings-api'
import { Panel, QueryState, SettingsShell } from './SettingsShell'

type Webhook = { id: string; url: string; events: string[]; status: string }
type Key = { id: string; name: string; createdAt: string; lastUsedAt?: string }

type WebhookForm = { url: string; events: string }
type EmailForm = { email: string; provider: string; apiKey: string }
type ApiKeyForm = { name: string }

export function WebhookSettings() {
  const client = useQueryClient()
  const hooks = useQuery({ queryKey: ['webhooks'], queryFn: () => settingsApi.get<Webhook[]>('/webhooks') })
  const form = useForm<WebhookForm>({ defaultValues: { events: 'CONVERSATION_CREATED,MESSAGE_CREATED' } })

  const create = useMutation({
    mutationFn: (value: WebhookForm) => settingsApi.post('/webhooks', { url: value.url, events: value.events.split(',').map((event) => event.trim()) }),
    onSuccess: () => {
      form.reset({ events: 'CONVERSATION_CREATED,MESSAGE_CREATED' })
      void client.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => settingsApi.delete(`/webhooks/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['webhooks'] }),
  })

  return (
    <SettingsShell title="Webhooks">
      <Panel title="Add webhook">
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={form.handleSubmit((value) => create.mutate(value))}>
          <input className="input flex-1" placeholder="https://example.com/events" {...form.register('url', { required: true })} />
          <input className="input flex-1" placeholder="Events, comma separated" {...form.register('events', { required: true })} />
          <button className="btn-primary" disabled={create.isPending}>Create</button>
        </form>
      </Panel>

      <Panel title="Configured endpoints">
        <QueryState loading={hooks.isLoading} error={hooks.error}>
          <div className="space-y-2">
            {hooks.data?.map((hook) => (
              <div className="rounded border p-3" key={hook.id}>
                <div className="flex justify-between gap-4">
                  <div>
                    <strong className="break-all">{hook.url}</strong>
                    <p className="mt-1 text-sm text-slate-500">{hook.events.join(', ')} · {hook.status}</p>
                  </div>
                  <div className="space-x-3 whitespace-nowrap">
                    <button type="button" className="text-brand-600">View logs</button>
                    <button type="button" className="text-brand-600">Retry failures</button>
                    <button type="button" className="text-red-600" onClick={() => remove.mutate(hook.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </QueryState>
      </Panel>
    </SettingsShell>
  )
}

export function EmailChannelSettings() {
  const form = useForm<EmailForm>({ defaultValues: { provider: 'sendgrid' } })

  const save = useMutation({
    mutationFn: (value: EmailForm) => settingsApi.post('/email/channels', value),
  })

  return (
    <SettingsShell title="Email channels">
      <Panel title="Connect support mailbox">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((value) => save.mutate(value))}>
          <label>
            Mailbox
            <input className="input" type="email" placeholder="support@company.com" {...form.register('email', { required: true })} />
          </label>
          <label>
            Provider
            <select className="input" {...form.register('provider')}>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
            </select>
          </label>
          <label className="md:col-span-2">
            Provider API key
            <input className="input" type="password" {...form.register('apiKey', { required: true })} />
          </label>
          <div>
            <button className="btn-primary" disabled={save.isPending}>Add and verify mailbox</button>
          </div>
        </form>
        {save.isSuccess && <p className="mt-3 text-sm text-green-700">Mailbox saved. Incoming activity will appear in conversations.</p>}
      </Panel>

      <Panel title="Inbound activity">
        <p className="text-sm text-slate-500">Inbound emails are normalized into customer conversations and visible in the conversation queue.</p>
      </Panel>
    </SettingsShell>
  )
}

export function ApiKeySettings() {
  const client = useQueryClient()
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: () => settingsApi.get<Key[]>('/api-keys') })
  const form = useForm<ApiKeyForm>()

  const created = useMutation({
    mutationFn: (value: ApiKeyForm) => settingsApi.post<{ id: string; key: string }>('/api-keys', value),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => settingsApi.delete(`/api-keys/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  return (
    <SettingsShell title="API keys">
      <Panel title="Generate API key">
        <form className="flex gap-3" onSubmit={form.handleSubmit((value) => created.mutate(value))}>
          <input className="input" placeholder="Key name" {...form.register('name', { required: true })} />
          <button className="btn-primary" disabled={created.isPending}>Generate key</button>
        </form>
        {created.data?.key && (
          <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
            <strong>Copy this key now:</strong>
            <code className="ml-2 break-all">{created.data.key}</code>
            <button type="button" className="ml-3 text-brand-600" onClick={() => void navigator.clipboard.writeText(created.data.key)}>
              Copy
            </button>
          </div>
        )}
      </Panel>

      <Panel title="Active keys">
        <QueryState loading={keys.isLoading} error={keys.error}>
          <div className="space-y-2">
            {keys.data?.map((key) => (
              <div className="flex justify-between rounded border p-3" key={key.id}>
                <span>
                  {key.name}
                  <small className="ml-2 text-slate-500">Created {new Date(key.createdAt).toLocaleDateString()}</small>
                </span>
                <button type="button" className="text-red-600" onClick={() => revoke.mutate(key.id)}>Revoke</button>
              </div>
            ))}
          </div>
        </QueryState>
      </Panel>

      <Panel title="Audit history">
        <p className="text-sm text-slate-500">Key creation and revocation are recorded in audit logs.</p>
      </Panel>
    </SettingsShell>
  )
}

