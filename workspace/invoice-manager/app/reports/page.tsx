'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Header from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, Download, FileSpreadsheet, TrendingUp, FileText } from 'lucide-react'

interface Project {
  id: string
  name: string
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState({
    type: 'invoices',
    projectId: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
    })
  }, [])

  const handleExport = () => {
    const params = new URLSearchParams({
      type: form.type,
      projectId: form.projectId,
      startDate: form.startDate,
      endDate: form.endDate,
    })
    window.open(`/api/reports?${params}`, '_blank')
  }

  const quickReports = [
    {
      title: 'All Invoices',
      description: 'Export all invoices with full details',
      icon: FileText,
      color: 'bg-blue-500',
      params: { type: 'invoices' },
    },
    {
      title: 'Cash Flow Report',
      description: 'Monthly invoiced vs paid breakdown',
      icon: TrendingUp,
      color: 'bg-emerald-500',
      params: { type: 'cashflow' },
    },
    {
      title: 'Tax Summary',
      description: 'Expense breakdown by category for tax prep',
      icon: FileSpreadsheet,
      color: 'bg-amber-500',
      params: { type: 'tax' },
    },
    {
      title: 'Reconciliation',
      description: 'Matched and unmatched bank transactions',
      icon: BarChart3,
      color: 'bg-purple-500',
      params: { type: 'reconciliation' },
    },
    {
      title: 'Overdue Invoices',
      description: 'All unpaid overdue invoices',
      icon: FileText,
      color: 'bg-red-500',
      params: { type: 'invoices', status: 'overdue' },
    },
    {
      title: `This Year (${new Date().getFullYear()})`,
      description: `All invoices for ${new Date().getFullYear()}`,
      icon: FileSpreadsheet,
      color: 'bg-indigo-500',
      params: {
        type: 'invoices',
        startDate: `${new Date().getFullYear()}-01-01`,
        endDate: `${new Date().getFullYear()}-12-31`,
      },
    },
  ]

  const downloadQuick = (params: Record<string, string | undefined>) => {
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ) as Record<string, string>
    const p = new URLSearchParams(filtered)
    window.open(`/api/reports?${p}`, '_blank')
  }

  return (
    <AppLayout>
      <Header title="Reports" subtitle="Export and analyze your invoice data" />
      <div className="p-6 space-y-6">
        {/* Quick Reports */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">Quick Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickReports.map(report => (
              <button
                key={report.title}
                onClick={() => downloadQuick(report.params)}
                className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 text-left hover:border-blue-400 hover:shadow-sm transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg ${report.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                  <report.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{report.title}</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{report.description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-blue-600">
                  <Download className="w-3.5 h-3.5" />
                  Download Excel
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Report Builder */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Custom Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Report Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="invoices">Invoices</option>
                <option value="cashflow">Cash Flow</option>
                <option value="tax">Tax Summary</option>
                <option value="reconciliation">Reconciliation</option>
                <option value="project">Project Report</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Project</label>
              <select
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
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
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Generate & Download Report
          </button>
        </div>

        {/* Project Reports */}
        {projects.length > 0 && (
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Project Reports</h2>
            <div className="space-y-2">
              {projects.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-sm text-[var(--color-foreground)]">{p.name}</span>
                  <button
                    onClick={() => downloadQuick({ type: 'project', projectId: p.id })}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Report
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
