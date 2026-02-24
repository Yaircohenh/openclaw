'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Header from '@/components/layout/Header'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { Settings, Mail, Cloud, Building, Tag, Zap, Plus, Trash2, ExternalLink, CheckCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const DEFAULT_CATEGORIES = [
  { name: 'Software', color: '#6366f1' },
  { name: 'Hardware', color: '#8b5cf6' },
  { name: 'Services', color: '#ec4899' },
  { name: 'Consulting', color: '#f97316' },
  { name: 'Marketing', color: '#eab308' },
  { name: 'Office', color: '#22c55e' },
  { name: 'Travel', color: '#06b6d4' },
  { name: 'Legal', color: '#3b82f6' },
  { name: 'Utilities', color: '#f43f5e' },
  { name: 'Other', color: '#94a3b8' },
]

interface Category {
  id: string
  name: string
  color: string
  description?: string
  _count?: { invoices: number }
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--color-border)]">
        <Icon className="w-4 h-4 text-blue-500" />
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  children,
  description,
}: {
  label: string
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start">
      <div>
        <label className="text-sm font-medium text-[var(--color-foreground)]">{label}</label>
        {description && <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{description}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500'

function SettingsContent() {
  const searchParams = useSearchParams()
  const gdriveStatus = searchParams.get('gdrive')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailListenerActive, setEmailListenerActive] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366f1' })
  const [addingCategory, setAddingCategory] = useState(false)
  const [gdriveConnected, setGdriveConnected] = useState(false)
  const [gdriveConnecting, setGdriveConnecting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [settingsRes, catsRes, gdriveRes] = await Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/gdrive').then(r => r.json()).catch(() => ({ connected: false })),
    ])
    setSettings(settingsRes)
    setCategories(Array.isArray(catsRes) ? catsRes : [])
    setGdriveConnected(gdriveRes.connected || gdriveStatus === 'connected')
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (gdriveStatus === 'connected') toast.success('Google Drive connected!')
    if (gdriveStatus === 'error') toast.error('Google Drive connection failed')
    if (gdriveStatus === 'not_configured') toast.error('Configure Client ID and Secret first')
  }, [gdriveStatus])

  const connectGoogleDrive = async () => {
    setGdriveConnecting(true)
    // Save settings first so client_id is stored
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    const res = await fetch('/api/gdrive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auth_url' }),
    })
    const data = await res.json()
    if (data.authUrl) {
      window.location.href = data.authUrl
    } else {
      toast.error(data.error || 'Failed to get auth URL')
      setGdriveConnecting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) toast.success('Settings saved')
    else toast.error('Failed to save settings')
    setSaving(false)
  }

  const set = (key: string, value: string) => {
    setSettings(s => ({ ...s, [key]: value }))
  }

  const toggleEmailListener = async () => {
    const action = emailListenerActive ? 'stop' : 'start'
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (res.ok) {
      setEmailListenerActive(!emailListenerActive)
      toast.success(data.message)
    } else {
      toast.error(data.error)
    }
  }

  const seedDefaultCategories = async () => {
    for (const cat of DEFAULT_CATEGORIES) {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      }).catch(() => {})
    }
    toast.success('Default categories added')
    fetchData()
  }

  const addCategory = async () => {
    if (!newCategory.name.trim()) return
    setAddingCategory(true)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    })
    if (res.ok) {
      toast.success('Category added')
      setNewCategory({ name: '', color: '#6366f1' })
      fetchData()
    } else {
      toast.error('Failed to add category (may already exist)')
    }
    setAddingCategory(false)
  }

  const deleteCategory = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Category deleted'); fetchData() }
    else toast.error('Failed to delete category')
  }

  if (loading) return <AppLayout><LoadingPage /></AppLayout>

  return (
    <AppLayout>
      <Header
        title="Settings"
        subtitle="Configure your invoice manager"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Company Info */}
        <Section title="Company Information" icon={Building}>
          <div className="space-y-4">
            <Field label="Company Name" description="Used in reports">
              <input
                value={settings['company.name'] || ''}
                onChange={e => set('company.name', e.target.value)}
                className={inputClass}
                placeholder="Your Company"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={settings['company.email'] || ''}
                onChange={e => set('company.email', e.target.value)}
                className={inputClass}
                placeholder="billing@company.com"
              />
            </Field>
            <Field label="Address">
              <textarea
                value={settings['company.address'] || ''}
                onChange={e => set('company.address', e.target.value)}
                rows={2}
                className={inputClass + ' resize-none'}
                placeholder="123 Main St, City, State 12345"
              />
            </Field>
          </div>
        </Section>

        {/* General Settings */}
        <Section title="General" icon={Settings}>
          <div className="space-y-4">
            <Field label="Default Currency">
              <select
                value={settings['general.currency'] || 'USD'}
                onChange={e => set('general.currency', e.target.value)}
                className={inputClass}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="JPY">JPY — Japanese Yen</option>
                <option value="CHF">CHF — Swiss Franc</option>
                <option value="INR">INR — Indian Rupee</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* IMAP Email Configuration */}
        <Section title="Email Invoice Ingestion (IMAP)" icon={Mail}>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
              Configure a dedicated inbox to automatically import invoices from email attachments.
            </div>
            <Field label="IMAP Server" description="e.g. imap.gmail.com">
              <input
                value={settings['imap.host'] || ''}
                onChange={e => set('imap.host', e.target.value)}
                className={inputClass}
                placeholder="imap.gmail.com"
              />
            </Field>
            <Field label="Port" description="Usually 993 (TLS)">
              <input
                type="number"
                value={settings['imap.port'] || '993'}
                onChange={e => set('imap.port', e.target.value)}
                className={inputClass}
                placeholder="993"
              />
            </Field>
            <Field label="Email Address">
              <input
                type="email"
                value={settings['imap.user'] || ''}
                onChange={e => set('imap.user', e.target.value)}
                className={inputClass}
                placeholder="invoices@yourcompany.com"
              />
            </Field>
            <Field label="Password" description="App password recommended">
              <input
                type="password"
                value={settings['imap.password'] || ''}
                onChange={e => set('imap.password', e.target.value)}
                className={inputClass}
                placeholder="••••••••••••"
              />
            </Field>
            <Field label="Use TLS">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => set('imap.tls', settings['imap.tls'] === 'true' ? 'false' : 'true')}
                  className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                    settings['imap.tls'] !== 'false' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    settings['imap.tls'] !== 'false' ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </div>
                <span className="text-sm text-[var(--color-foreground)]">
                  {settings['imap.tls'] !== 'false' ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </Field>
            <Field label="Email Listener">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleEmailListener}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    emailListenerActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  {emailListenerActive ? 'Stop Listener' : 'Start Listener'}
                </button>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {emailListenerActive ? 'Polling every 5 minutes' : 'Not running'}
                </span>
              </div>
            </Field>
          </div>
        </Section>

        {/* Google Drive */}
        <Section title="Google Drive Integration" icon={Cloud}>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              Create OAuth 2.0 credentials in Google Cloud Console → APIs &amp; Services → Credentials. Add the redirect URI:{' '}
              <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
                http://localhost:3000/api/gdrive?action=callback
              </code>
            </div>
            {gdriveConnected && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Google Drive is connected and ready to use
              </div>
            )}
            <Field label="Client ID">
              <input
                value={settings['gdrive.clientId'] || ''}
                onChange={e => set('gdrive.clientId', e.target.value)}
                className={inputClass}
                placeholder="your-client-id.apps.googleusercontent.com"
              />
            </Field>
            <Field label="Client Secret">
              <input
                type="password"
                value={settings['gdrive.clientSecret'] || ''}
                onChange={e => set('gdrive.clientSecret', e.target.value)}
                className={inputClass}
                placeholder="••••••••••••"
              />
            </Field>
            <Field label="Root Folder ID" description="Optional: specific Drive folder ID">
              <input
                value={settings['gdrive.folderId'] || ''}
                onChange={e => set('gdrive.folderId', e.target.value)}
                className={inputClass}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
              />
            </Field>
            <Field label="Authorization">
              <div className="flex items-center gap-3">
                <button
                  onClick={connectGoogleDrive}
                  disabled={gdriveConnecting || !settings['gdrive.clientId']}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {gdriveConnecting ? 'Redirecting...' : gdriveConnected ? 'Reconnect Drive' : 'Connect Google Drive'}
                </button>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  Save settings first, then click to authorize
                </span>
              </div>
            </Field>
          </div>
        </Section>

        {/* Categories */}
        <Section title="Invoice Categories" icon={Tag}>
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-3">No categories yet</p>
                <button
                  onClick={seedDefaultCategories}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Default Categories
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                        <span className="text-sm font-medium text-[var(--color-foreground)]">{cat.name}</span>
                        {cat._count && cat._count.invoices > 0 && (
                          <span className="text-xs text-[var(--color-muted-foreground)]">({cat._count.invoices})</span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1 rounded text-[var(--color-muted-foreground)] hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={seedDefaultCategories}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Reset to defaults
                </button>
              </>
            )}

            {/* Add category */}
            <div className="flex gap-2 pt-2 border-t border-[var(--color-border)]">
              <input
                type="color"
                value={newCategory.color}
                onChange={e => setNewCategory(n => ({ ...n, color: e.target.value }))}
                className="w-10 h-9 rounded border border-[var(--color-border)] cursor-pointer p-0.5"
              />
              <input
                value={newCategory.name}
                onChange={e => setNewCategory(n => ({ ...n, name: e.target.value }))}
                placeholder="Category name"
                className={inputClass}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
              />
              <button
                onClick={addCategory}
                disabled={addingCategory || !newCategory.name.trim()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </Section>
      </div>
    </AppLayout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<AppLayout><div className="p-6">Loading...</div></AppLayout>}>
      <SettingsContent />
    </Suspense>
  )
}
