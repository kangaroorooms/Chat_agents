import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { settingsApi } from './settings-api'
import { Panel, QueryState, SettingsShell } from './SettingsShell'

type Document = { id: string; title: string; createdAt: string; status?: string }
type Upload = { title: string; content: string; tags: string }

export default function KnowledgeSettings() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const client = useQueryClient()
  const form = useForm<Upload>({ defaultValues: { tags: '' } })

  const docs = useQuery({
    queryKey: ['knowledge', companyId],
    queryFn: () => settingsApi.get<{ data?: Document[] } | Document[]>(`/knowledge/companies/${companyId}/documents`),
    enabled: Boolean(companyId),
  })

  const upload = useMutation({
    mutationFn: (data: Upload) =>
      settingsApi.post('/knowledge/documents', {
        companyId,
        title: data.title,
        content: data.content,
        tags: data.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        sourceType: 'DOCUMENT',
        status: 'ACTIVE',
      }),
    onSuccess: () => {
      form.reset({ tags: '' })
      void client.invalidateQueries({ queryKey: ['knowledge', companyId] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => settingsApi.delete(`/knowledge/documents/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['knowledge', companyId] }),
  })

  const values: Document[] = Array.isArray(docs.data)
    ? docs.data
    : docs.data && 'data' in docs.data
      ? docs.data.data ?? []
      : []

  return (
    <SettingsShell title="Knowledge base">
      <Panel title="Upload document">
        <form className="grid gap-3" onSubmit={form.handleSubmit((data) => upload.mutate(data))}>
          <input className="input" placeholder="Document title" {...form.register('title', { required: true })} />
          <textarea className="input min-h-36" placeholder="Paste content to index" {...form.register('content', { required: true })} />
          <input className="input" placeholder="Tags, comma separated" {...form.register('tags')} />
          <button className="btn-primary w-fit" disabled={upload.isPending}>Upload and index</button>
        </form>
      </Panel>

      <Panel title="Documents">
        <QueryState loading={docs.isLoading} error={docs.error}>
          <div className="space-y-2">
            {values.map((doc) => (
              <div className="flex justify-between rounded border p-3" key={doc.id}>
                <div>
                  <strong>{doc.title}</strong>
                  <p className="text-sm text-slate-500">
                    {doc.status ?? 'Ready'} · {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-x-3">
                  <button type="button" className="text-brand-600">Re-index</button>
                  <button type="button" className="text-red-600" onClick={() => remove.mutate(doc.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </QueryState>
      </Panel>
    </SettingsShell>
  )
}

