'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Header from '@/components/layout/Header'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { ArrowLeftRight, Upload, X, Link2, CheckCircle, Zap } from 'lucide-react'
import path from 'path'

interface UnmatchedInvoice {
  id: string
  invoiceNumber?: string
  vendorName?: string
  totalAmount: number
  dueDate?: string
  invoiceDate?: string
}

interface BankTransaction {
  id: string
  transactionDate: string
  description: string
  amount: number
  balance?: number
  reference?: string
  reconciliations: any[]
}

interface ReconciliationItem {
  id: string
  invoice?: { id: string; invoiceNumber?: string; vendorName?: string; totalAmount: number }
  bankTransaction?: { id: string; description: string; amount: number; transactionDate: string }
  status: string
  notes?: string
}

interface Suggestion {
  invoiceId: string
  transactionId: string
  score: number
}

function UploadStatementZone({ onUpload }: { onUpload: (file: File, bankName: string) => Promise<void> }) {
  const [uploading, setUploading] = useState(false)
  const [bankName, setBankName] = useState('')

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      await onUpload(file, bankName)
      toast.success(`Parsed ${file.name}`)
    } catch {
      toast.error('Failed to parse statement')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-3">Upload Bank Statement</h3>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Bank Name</label>
          <input
            value={bankName}
            onChange={e => setBankName(e.target.value)}
            placeholder="e.g. Chase, Bank of America"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
          uploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}>
          <Upload className="w-4 h-4" />
          {uploading ? 'Parsing...' : 'Upload CSV/OFX'}
          <input
            type="file"
            accept=".csv,.ofx,.qfx"
            className="hidden"
            disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </label>
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)] mt-2">Supported: CSV, OFX, QFX</p>
    </div>
  )
}

export default function ReconciliationPage() {
  const [data, setData] = useState<{
    unmatchedInvoices: UnmatchedInvoice[]
    unmatchedTransactions: BankTransaction[]
    reconciliations: ReconciliationItem[]
    suggestions: Suggestion[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [selectedTxn, setSelectedTxn] = useState<string | null>(null)
  const [matching, setMatching] = useState(false)
  const [activeTab, setActiveTab] = useState<'match' | 'matched'>('match')

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/reconciliation')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleUploadStatement = async (file: File, bankName: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (bankName) formData.append('bankName', bankName)
    const res = await fetch('/api/bank-statements', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Upload failed')
    fetchData()
  }

  const handleMatch = async () => {
    if (!selectedInvoice || !selectedTxn) return
    setMatching(true)
    const res = await fetch('/api/reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: selectedInvoice, bankTransactionId: selectedTxn }),
    })
    if (!res.ok) { toast.error('Match failed'); setMatching(false); return }
    toast.success('Matched! Invoice marked as paid.')
    setSelectedInvoice(null)
    setSelectedTxn(null)
    setMatching(false)
    fetchData()
  }

  const handleAutoApply = async (suggestion: Suggestion) => {
    const res = await fetch('/api/reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: suggestion.invoiceId,
        bankTransactionId: suggestion.transactionId,
      }),
    })
    if (!res.ok) { toast.error('Auto-match failed'); return }
    toast.success('Auto-matched!')
    fetchData()
  }

  const handleUnmatch = async (id: string) => {
    const res = await fetch('/api/reconciliation', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { toast.error('Failed to unmatch'); return }
    toast.success('Unmatched')
    fetchData()
  }

  return (
    <AppLayout>
      <Header title="Bank Reconciliation" subtitle="Match bank transactions to invoices" />
      <div className="p-6 space-y-6">
        <UploadStatementZone onUpload={handleUploadStatement} />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--color-muted)] rounded-lg w-fit">
          {([['match', 'Match Transactions'], ['matched', 'Matched']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === key
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? <LoadingPage /> : !data ? null : activeTab === 'match' ? (
          <div className="space-y-4">
            {/* AI Suggestions */}
            {data.suggestions.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    AI Match Suggestions ({data.suggestions.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {data.suggestions.slice(0, 5).map((s, i) => {
                    const inv = data.unmatchedInvoices.find(x => x.id === s.invoiceId)
                    const txn = data.unmatchedTransactions.find(x => x.id === s.transactionId)
                    if (!inv || !txn) return null
                    return (
                      <div key={i} className="flex items-center justify-between bg-white dark:bg-amber-950/30 rounded-lg p-3">
                        <div className="text-xs">
                          <span className="font-medium">{inv.vendorName || 'Unknown'}</span>
                          <span className="text-[var(--color-muted-foreground)]"> {formatCurrency(inv.totalAmount)}</span>
                          <span className="text-[var(--color-muted-foreground)]"> ↔ </span>
                          <span className="font-medium">{txn.description.substring(0, 30)}</span>
                          <span className="text-[var(--color-muted-foreground)]"> {formatCurrency(Math.abs(txn.amount))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-600 font-medium">{Math.round(s.score * 100)}%</span>
                          <button
                            onClick={() => handleAutoApply(s)}
                            className="px-2.5 py-1 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Manual Match */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Unmatched Invoices */}
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                  <h3 className="text-sm font-semibold">Unmatched Invoices ({data.unmatchedInvoices.length})</h3>
                </div>
                {data.unmatchedInvoices.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)] p-6 text-center">All invoices matched!</p>
                ) : (
                  <div className="divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
                    {data.unmatchedInvoices.map(inv => (
                      <button
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv.id === selectedInvoice ? null : inv.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-muted)]/50 transition-colors ${
                          selectedInvoice === inv.id ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                            {inv.vendorName || 'Unknown Vendor'}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {inv.invoiceNumber || inv.id.slice(0, 8)} · Due {formatDate(inv.dueDate)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[var(--color-foreground)] ml-2 whitespace-nowrap">
                          {formatCurrency(inv.totalAmount)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Unmatched Transactions */}
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                  <h3 className="text-sm font-semibold">Bank Transactions ({data.unmatchedTransactions.length})</h3>
                </div>
                {data.unmatchedTransactions.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)] p-6 text-center">No unmatched transactions</p>
                ) : (
                  <div className="divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
                    {data.unmatchedTransactions.map(txn => (
                      <button
                        key={txn.id}
                        onClick={() => setSelectedTxn(txn.id === selectedTxn ? null : txn.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-muted)]/50 transition-colors ${
                          selectedTxn === txn.id ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                            {txn.description}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {formatDate(txn.transactionDate)}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold ml-2 whitespace-nowrap ${txn.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(Math.abs(txn.amount))}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Match button */}
            {(selectedInvoice || selectedTxn) && (
              <div className="flex items-center justify-center gap-4 py-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {selectedInvoice && selectedTxn
                    ? 'Ready to match!'
                    : selectedInvoice
                    ? 'Select a bank transaction'
                    : 'Select an invoice'}
                </span>
                {selectedInvoice && selectedTxn && (
                  <button
                    onClick={handleMatch}
                    disabled={matching}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    {matching ? 'Matching...' : 'Create Match'}
                  </button>
                )}
                <button onClick={() => { setSelectedInvoice(null); setSelectedTxn(null) }} className="text-sm text-blue-600 hover:underline">
                  Clear
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Matched reconciliations */
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            {data.reconciliations.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="No matches yet"
                description="Upload a bank statement and match transactions to invoices"
              />
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {data.reconciliations.map(rec => (
                  <div key={rec.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-6 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                          {rec.invoice?.vendorName || 'Unknown Vendor'}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          Invoice: {rec.invoice?.invoiceNumber || rec.invoice?.id?.slice(0, 8)} · {formatCurrency(rec.invoice?.totalAmount || 0)}
                        </p>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-[var(--color-muted-foreground)] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                          {rec.bankTransaction?.description?.substring(0, 40) || 'Unknown'}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {formatDate(rec.bankTransaction?.transactionDate)} · {formatCurrency(Math.abs(rec.bankTransaction?.amount || 0))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <StatusBadge status={rec.status} />
                      <button
                        onClick={() => handleUnmatch(rec.id)}
                        className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Unmatch"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
