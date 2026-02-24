'use client'

import { useEffect, useState, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Header from '@/components/layout/Header'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Upload, Receipt, X, Link2, Link2Off, Trash2, CheckCircle } from 'lucide-react'

interface ReceiptItem {
  id: string
  fileName: string
  filePath: string
  fileType: string
  fileSize?: number
  uploadedAt: string
  invoiceId?: string
  invoice?: {
    id: string
    invoiceNumber?: string
    vendorName?: string
    totalAmount: number
  }
  isManualMatch: boolean
  matchScore?: number
  notes?: string
}

interface Invoice {
  id: string
  invoiceNumber?: string
  vendorName?: string
  totalAmount: number
  dueDate?: string
}

interface MatchSuggestion {
  invoiceId: string
  score: number
}

function UploadZone({ onUpload }: { onUpload: (file: File, invoiceId?: string) => Promise<void> }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      await onUpload(file)
      toast.success('Receipt uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
          : 'border-[var(--color-border)] hover:border-blue-400 hover:bg-[var(--color-muted)]/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <Upload className="w-8 h-8 text-[var(--color-muted-foreground)] mx-auto mb-2" />
      <p className="text-sm font-medium text-[var(--color-foreground)]">
        {uploading ? 'Uploading...' : 'Drop receipt here or click to upload'}
      </p>
      <p className="text-xs text-[var(--color-muted-foreground)] mt-1">PDF, JPG, PNG supported</p>
    </div>
  )
}

function MatchModal({
  receipt,
  invoices,
  suggestions,
  onMatch,
  onClose,
}: {
  receipt: ReceiptItem
  invoices: Invoice[]
  suggestions: MatchSuggestion[]
  onMatch: (receiptId: string, invoiceId: string) => Promise<void>
  onClose: () => void
}) {
  const [selectedId, setSelectedId] = useState('')
  const [matching, setMatching] = useState(false)

  const suggestedInvoices = suggestions
    .map(s => ({ ...s, invoice: invoices.find(inv => inv.id === s.invoiceId) }))
    .filter(s => s.invoice)

  const handleMatch = async () => {
    if (!selectedId) return
    setMatching(true)
    try {
      await onMatch(receipt.id, selectedId)
      onClose()
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl w-full max-w-lg mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">Match Receipt to Invoice</h2>
          <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">Receipt: {receipt.fileName}</p>

          {suggestedInvoices.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)] mb-2">AI Suggestions</p>
              {suggestedInvoices.map(({ invoice, score, invoiceId }) => (
                <button
                  key={invoiceId}
                  onClick={() => setSelectedId(invoiceId)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border mb-2 text-left transition-colors ${
                    selectedId === invoiceId
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]/50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{invoice?.vendorName || 'Unknown'}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{invoice?.invoiceNumber || invoice?.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(invoice?.totalAmount || 0)}</p>
                    <p className="text-xs text-emerald-600">{Math.round(score * 100)}% match</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] mb-2">All Invoices</p>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an invoice...</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.vendorName || 'Unknown'} — {formatCurrency(inv.totalAmount)} {inv.invoiceNumber ? `(${inv.invoiceNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleMatch}
              disabled={!selectedId || matching}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {matching ? 'Matching...' : 'Match Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [matchModal, setMatchModal] = useState<ReceiptItem | null>(null)
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all')

  const fetchData = async () => {
    setLoading(true)
    const [receiptsRes, invoicesRes] = await Promise.all([
      fetch('/api/receipts').then(r => r.json()),
      fetch('/api/invoices?limit=200').then(r => r.json()),
    ])
    setReceipts(Array.isArray(receiptsRes) ? receiptsRes : [])
    setInvoices(invoicesRes.invoices || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/receipts', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    setSuggestions(data.suggestions || [])
    fetchData()
    if (data.suggestions?.length > 0) {
      toast.info(`${data.suggestions.length} invoice match suggestion(s) found`)
    }
  }

  const handleMatch = async (receiptId: string, invoiceId: string) => {
    const res = await fetch(`/api/receipts/${receiptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, isManualMatch: true }),
    })
    if (!res.ok) { toast.error('Failed to match receipt'); return }
    toast.success('Receipt matched to invoice')
    fetchData()
  }

  const handleUnmatch = async (receiptId: string) => {
    const res = await fetch(`/api/receipts/${receiptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: null }),
    })
    if (!res.ok) { toast.error('Failed to unmatch receipt'); return }
    toast.success('Receipt unmatched')
    fetchData()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Receipt deleted'); fetchData() }
    else toast.error('Failed to delete receipt')
    setDeleteConfirm(null)
  }

  const filtered = receipts.filter(r => {
    if (filter === 'matched') return !!r.invoiceId
    if (filter === 'unmatched') return !r.invoiceId
    return true
  })

  const matchedCount = receipts.filter(r => !!r.invoiceId).length

  return (
    <AppLayout>
      <Header
        title="Receipts"
        subtitle={`${receipts.length} total · ${matchedCount} matched`}
      />
      <div className="p-6 space-y-6">
        <UploadZone onUpload={handleUpload} />

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-[var(--color-muted)] rounded-lg w-fit">
          {(['all', 'matched', 'unmatched'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                filter === f
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingPage />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No receipts yet"
            description="Upload receipts to match them with your invoices"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(receipt => (
              <div key={receipt.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                {/* Preview area */}
                <div className="h-32 bg-[var(--color-muted)] flex items-center justify-center relative">
                  {receipt.fileType === 'image' ? (
                    <img
                      src={`/uploads/receipts/${receipt.fileName}`}
                      alt={receipt.fileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Receipt className="w-12 h-12 text-[var(--color-muted-foreground)]" />
                  )}
                  {receipt.invoiceId && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-medium text-[var(--color-foreground)] truncate mb-1">{receipt.fileName}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mb-2">{formatDate(receipt.uploadedAt)}</p>

                  {receipt.invoice ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 mb-2">
                      <Link2 className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {receipt.invoice.vendorName} — {formatCurrency(receipt.invoice.totalAmount)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 mb-2">Unmatched</p>
                  )}

                  <div className="flex items-center gap-1.5">
                    {receipt.invoiceId ? (
                      <button
                        onClick={() => handleUnmatch(receipt.id)}
                        title="Unmatch"
                        className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors"
                      >
                        <Link2Off className="w-3.5 h-3.5" />
                        Unmatch
                      </button>
                    ) : (
                      <button
                        onClick={() => { setMatchModal(receipt) }}
                        className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Match
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(receipt.id)}
                      className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-red-600 hover:border-red-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {matchModal && (
        <MatchModal
          receipt={matchModal}
          invoices={invoices}
          suggestions={suggestions}
          onMatch={handleMatch}
          onClose={() => setMatchModal(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Receipt"
        description="This will permanently delete this receipt file."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </AppLayout>
  )
}
