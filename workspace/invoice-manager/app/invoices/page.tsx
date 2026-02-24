'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Header from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Plus, Search, Filter, Download, Trash2, CheckSquare,
  ChevronDown, ChevronUp, Edit2, X, Check, FileText,
  MoreHorizontal, SortAsc, SortDesc, RefreshCw,
} from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber?: string
  vendorName?: string
  vendor?: { id: string; name: string }
  project?: { id: string; name: string; color: string }
  category?: { id: string; name: string; color: string }
  categoryName?: string
  invoiceDate?: string
  dueDate?: string
  paidDate?: string
  totalAmount: number
  amount: number
  currency: string
  status: string
  description?: string
  source: string
  isDuplicate?: boolean
  isRecurring?: boolean
  receipts?: { id: string }[]
  reconciliations?: { id: string }[]
}

interface Project { id: string; name: string }
interface Category { id: string; name: string; color: string }

function InvoiceModal({
  invoice,
  projects,
  categories,
  onClose,
  onSave,
}: {
  invoice: Partial<Invoice> | null
  projects: Project[]
  categories: Category[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [form, setForm] = useState({
    invoiceNumber: invoice?.invoiceNumber || '',
    vendorName: invoice?.vendorName || invoice?.vendor?.name || '',
    projectId: invoice?.project?.id || '',
    categoryId: invoice?.category?.id || '',
    invoiceDate: invoice?.invoiceDate ? formatDateInput(invoice.invoiceDate) : '',
    dueDate: invoice?.dueDate ? formatDateInput(invoice.dueDate) : '',
    amount: invoice?.amount || invoice?.totalAmount || 0,
    currency: invoice?.currency || 'USD',
    tax: 0,
    status: invoice?.status || 'unpaid',
    description: invoice?.description || '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        ...form,
        amount: parseFloat(String(form.amount)) || 0,
        totalAmount: parseFloat(String(form.amount)) || 0,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">{invoice?.id ? 'Edit Invoice' : 'New Invoice'}</h2>
          <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Invoice #</label>
              <input
                value={form.invoiceNumber}
                onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="INV-001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Vendor *</label>
            <input
              required
              value={form.vendorName}
              onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Vendor name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Project</label>
              <select
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Invoice Date</label>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Amount *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Description of goods/services"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : invoice?.id ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InvoicesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editInvoice, setEditInvoice] = useState<Partial<Invoice> | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [bulkAction, setBulkAction] = useState('')

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    projectId: searchParams.get('projectId') || '',
    categoryId: searchParams.get('categoryId') || '',
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
  })

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      search: filters.search,
      status: filters.status,
      projectId: filters.projectId,
      categoryId: filters.categoryId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: String(filters.page),
      limit: '50',
    })

    const res = await fetch(`/api/invoices?${params}`)
    const data = await res.json()
    setInvoices(data.invoices || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([p, c]) => {
      setProjects(Array.isArray(p) ? p : [])
      setCategories(Array.isArray(c) ? c : [])
    })
  }, [])

  const handleSave = async (data: any) => {
    const isEdit = !!editInvoice?.id
    const url = isEdit ? `/api/invoices/${editInvoice!.id}` : '/api/invoices'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      toast.error('Failed to save invoice')
      return
    }

    toast.success(isEdit ? 'Invoice updated' : 'Invoice created')
    fetchInvoices()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Invoice deleted')
      fetchInvoices()
    } else {
      toast.error('Failed to delete invoice')
    }
    setDeleteConfirm(null)
  }

  const handleMarkPaid = async (id: string) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid', paidDate: new Date().toISOString() }),
    })
    if (res.ok) {
      toast.success('Marked as paid')
      fetchInvoices()
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return
    const ids = Array.from(selected)

    const res = await fetch('/api/invoices/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action: bulkAction }),
    })

    if (res.ok) {
      const data = await res.json()
      toast.success(`Action applied to ${data.count} invoice(s)`)
      setSelected(new Set())
      setBulkAction('')
      fetchInvoices()
    } else {
      toast.error('Bulk action failed')
    }
  }

  const exportExcel = () => {
    const params = new URLSearchParams({
      type: 'invoices',
      projectId: filters.projectId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
    window.open(`/api/reports?${params}`, '_blank')
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === invoices.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(invoices.map(i => i.id)))
    }
  }

  const getEffectiveStatus = (inv: Invoice) => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return inv.status
    if (inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue'
    return inv.status
  }

  return (
    <AppLayout>
      <Header
        title="Invoices"
        subtitle={`${total} total invoice${total !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => { setEditInvoice(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
              <input
                placeholder="Search invoices..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.projectId}
              onChange={e => setFilters(f => ({ ...f, projectId: e.target.value, page: 1 }))}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={filters.categoryId}
              onChange={e => setFilters(f => ({ ...f, categoryId: e.target.value, page: 1 }))}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Start date"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="End date"
            />
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selected.size} selected
            </span>
            <select
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-blue-950 focus:outline-none"
            >
              <option value="">Select action...</option>
              <option value="mark_paid">Mark as Paid</option>
              <option value="mark_unpaid">Mark as Unpaid</option>
              <option value="delete">Delete</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-sm text-blue-600 hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          {loading ? (
            <LoadingPage />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices found"
              description="Create your first invoice or adjust your filters"
              action={
                <button
                  onClick={() => { setEditInvoice(null); setShowModal(true) }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Invoice
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selected.size === invoices.length && invoices.length > 0}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)]">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)]">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)]">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)]">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)]">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)]">Due</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)]">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {invoices.map(inv => {
                    const effectiveStatus = getEffectiveStatus(inv)
                    const isOverdue = effectiveStatus === 'overdue'
                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-[var(--color-muted)]/30 transition-colors ${
                          isOverdue ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(inv.id)}
                            onChange={() => toggleSelect(inv.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-[var(--color-foreground)]">
                              {inv.invoiceNumber || '—'}
                            </span>
                            {inv.isDuplicate && (
                              <span title="Possible duplicate" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 px-1.5 py-0.5 rounded font-medium">
                                DUP
                              </span>
                            )}
                            {inv.isRecurring && (
                              <span title="Recurring invoice" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                                REC
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-[var(--color-foreground)] truncate max-w-32 block">
                            {inv.vendorName || inv.vendor?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {inv.project ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: inv.project.color }}
                              />
                              <span className="text-xs text-[var(--color-foreground)] truncate max-w-24">
                                {inv.project.name}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--color-muted-foreground)]">
                            {inv.categoryName || inv.category?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                          {formatDate(inv.invoiceDate)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-[var(--color-muted-foreground)]'}>
                            {formatDate(inv.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--color-foreground)]">
                          {formatCurrency(inv.totalAmount || inv.amount, inv.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={effectiveStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {effectiveStatus !== 'paid' && (
                              <button
                                onClick={() => handleMarkPaid(inv.id)}
                                title="Mark as paid"
                                className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => { setEditInvoice(inv); setShowModal(true) }}
                              title="Edit"
                              className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(inv.id)}
                              title="Delete"
                              className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-muted-foreground)]">
              Showing {(filters.page - 1) * 50 + 1}–{Math.min(filters.page * 50, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={filters.page === 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={filters.page * 50 >= total}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <InvoiceModal
          invoice={editInvoice}
          projects={projects}
          categories={categories}
          onClose={() => { setShowModal(false); setEditInvoice(null) }}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Invoice"
        description="This will permanently delete this invoice and all associated data. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </AppLayout>
  )
}


export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" /></div>}>
      <InvoicesPageContent />
    </Suspense>
  )
}
