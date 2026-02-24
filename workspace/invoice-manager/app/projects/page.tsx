'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Header from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, FolderOpen, X, ExternalLink, TrendingUp } from 'lucide-react'

interface Project {
  id: string
  name: string
  client?: string
  budget?: number
  startDate?: string
  endDate?: string
  status: string
  description?: string
  color: string
  totalSpend: number
  paidAmount: number
  invoiceCount: number
  budgetRemaining?: number
  budgetUsedPercent?: number
}

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

function ProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: Partial<Project> | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: project?.name || '',
    client: project?.client || '',
    budget: project?.budget || '',
    startDate: project?.startDate ? formatDateInput(project.startDate) : '',
    endDate: project?.endDate ? formatDateInput(project.endDate) : '',
    status: project?.status || 'active',
    description: project?.description || '',
    color: project?.color || PROJECT_COLORS[0],
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">{project?.id ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Project Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Project name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Client</label>
              <input
                value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Client name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Budget</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Color</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PROJECT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={`w-6 h-6 rounded-full transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Project description"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : project?.id ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProject, setEditProject] = useState<Partial<Project> | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('active')

  const fetchProjects = async () => {
    setLoading(true)
    const params = statusFilter ? `?status=${statusFilter}&includeStats=true` : '?includeStats=true'
    const res = await fetch(`/api/projects${params}`)
    const data = await res.json()
    setProjects(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [statusFilter])

  const handleSave = async (data: any) => {
    const isEdit = !!editProject?.id
    const url = isEdit ? `/api/projects/${editProject!.id}` : '/api/projects'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) { toast.error('Failed to save project'); return }
    toast.success(isEdit ? 'Project updated' : 'Project created')
    fetchProjects()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Project deleted'); fetchProjects() }
    else toast.error('Failed to delete project')
    setDeleteConfirm(null)
  }

  const handleArchive = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    if (res.ok) { toast.success('Project archived'); fetchProjects() }
  }

  const exportProject = (id: string) => {
    window.open(`/api/reports?type=project&projectId=${id}`, '_blank')
  }

  return (
    <AppLayout>
      <Header
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => { setEditProject(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-[var(--color-muted)] rounded-lg w-fit">
          {['active', 'completed', 'archived', ''].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingPage />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create a project to organize your invoices and track budgets"
            action={
              <button
                onClick={() => { setEditProject(null); setShowModal(true) }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Project
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(project => {
              const pct = project.budget ? Math.min((project.totalSpend / project.budget) * 100, 100) : 0
              const isOverBudget = project.budget && project.totalSpend > project.budget
              return (
                <div key={project.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: project.color + '20' }}>
                        <FolderOpen className="w-5 h-5" style={{ color: project.color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-[var(--color-foreground)] truncate">{project.name}</h3>
                        {project.client && <p className="text-xs text-[var(--color-muted-foreground)] truncate">{project.client}</p>}
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">Total Spent</p>
                      <p className={`text-sm font-bold ${isOverBudget ? 'text-red-600' : 'text-[var(--color-foreground)]'}`}>
                        {formatCurrency(project.totalSpend)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">Budget</p>
                      <p className="text-sm font-bold text-[var(--color-foreground)]">
                        {project.budget ? formatCurrency(project.budget) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">Invoices</p>
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">{project.invoiceCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">Remaining</p>
                      <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                        {project.budget ? formatCurrency(project.budget - project.totalSpend) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Budget bar */}
                  {project.budget && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-[var(--color-muted-foreground)] mb-1">
                        <span>Budget used</span>
                        <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : project.color,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  {(project.startDate || project.endDate) && (
                    <p className="text-xs text-[var(--color-muted-foreground)] mb-3">
                      {formatDate(project.startDate)} — {formatDate(project.endDate)}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
                    <a
                      href={`/invoices?projectId=${project.id}`}
                      className="flex-1 text-center text-xs font-medium text-blue-600 hover:underline"
                    >
                      View Invoices
                    </a>
                    <button
                      onClick={() => exportProject(project.id)}
                      title="Export report"
                      className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditProject(project); setShowModal(true) }}
                      title="Edit"
                      className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(project.id)}
                      title="Delete"
                      className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal
          project={editProject}
          onClose={() => { setShowModal(false); setEditProject(null) }}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Project"
        description="This will delete the project. Invoices assigned to this project will be unassigned but not deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </AppLayout>
  )
}
