'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Header from '@/components/layout/Header'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  FileText,
  ChevronRight,
  Calendar,
} from 'lucide-react'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#34d399']

interface DashboardData {
  summary: {
    totalUnpaid: number
    unpaidCount: number
    totalOverdue: number
    overdueCount: number
    upcoming30: number
    upcoming30Count: number
    upcoming60: number
    upcoming90: number
  }
  monthlyData: Array<{ period: string; expenses: number; invoiceCount: number }>
  categoryBreakdown: Array<{ name: string; amount: number; count: number }>
  topVendors: Array<{ id: string; name: string; totalSpend: number; invoiceCount: number }>
  overdueInvoices: any[]
  upcomingInvoices: any[]
  projectStats: Array<{ id: string; name: string; budget?: number; totalSpend: number; color: string }>
}

function SummaryCard({
  title,
  value,
  count,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: number
  count?: number
  icon: any
  color: string
  subtitle?: string
}) {
  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{title}</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)] mt-1">
            {formatCurrency(value)}
          </p>
          {count !== undefined && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              {count} invoice{count !== 1 ? 's' : ''}
              {subtitle && ` · ${subtitle}`}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <AppLayout><LoadingPage /></AppLayout>
  if (!data) return <AppLayout><div className="p-6">Failed to load dashboard</div></AppLayout>

  return (
    <AppLayout>
      <Header title="Dashboard" subtitle="Cash flow overview and key metrics" />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Unpaid"
            value={data.summary.totalUnpaid}
            count={data.summary.unpaidCount}
            icon={FileText}
            color="bg-blue-500"
          />
          <SummaryCard
            title="Overdue"
            value={data.summary.totalOverdue}
            count={data.summary.overdueCount}
            icon={AlertTriangle}
            color="bg-red-500"
          />
          <SummaryCard
            title="Due Next 30 Days"
            value={data.summary.upcoming30}
            count={data.summary.upcoming30Count}
            icon={Clock}
            color="bg-amber-500"
          />
          <SummaryCard
            title="Due Next 90 Days"
            value={data.summary.upcoming90}
            icon={Calendar}
            color="bg-emerald-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Cash Flow */}
          <div className="lg:col-span-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Monthly Expenses</h2>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#6366f1"
                  fill="url(#expGrad)"
                  strokeWidth={2}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Pie */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Expenses by Category</h2>
            {data.categoryBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                    >
                      {data.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {data.categoryBreakdown.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-[var(--color-foreground)] truncate max-w-[100px]">{c.name}</span>
                      </div>
                      <span className="text-[var(--color-muted-foreground)]">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-[var(--color-muted-foreground)] text-sm">
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overdue Invoices */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                <span className="text-red-500">⚠</span> Overdue Invoices
              </h2>
              <a href="/invoices?status=overdue" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            {data.overdueInvoices.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] text-center py-6">No overdue invoices</p>
            ) : (
              <div className="space-y-3">
                {data.overdueInvoices.map((inv) => (
                  <a key={inv.id} href={`/invoices?id=${inv.id}`} className="flex items-start justify-between hover:opacity-80 transition-opacity">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--color-foreground)] truncate">
                        {inv.vendorName || inv.vendor?.name || 'Unknown Vendor'}
                      </p>
                      <p className="text-xs text-red-500">Due {formatDate(inv.dueDate)}</p>
                    </div>
                    <span className="text-xs font-medium text-[var(--color-foreground)] ml-2 whitespace-nowrap">
                      {formatCurrency(inv.totalAmount)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Payments */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Upcoming (30 Days)</h2>
              <a href="/invoices?upcoming=true" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            {data.upcomingInvoices.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] text-center py-6">No upcoming payments</p>
            ) : (
              <div className="space-y-3">
                {data.upcomingInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--color-foreground)] truncate">
                        {inv.vendorName || inv.vendor?.name || 'Unknown Vendor'}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">Due {formatDate(inv.dueDate)}</p>
                    </div>
                    <span className="text-xs font-medium text-[var(--color-foreground)] ml-2 whitespace-nowrap">
                      {formatCurrency(inv.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Vendors */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Top Vendors</h2>
            {data.topVendors.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] text-center py-6">No vendors yet</p>
            ) : (
              <div className="space-y-3">
                {data.topVendors.slice(0, 6).map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--color-foreground)] truncate">{vendor.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{vendor.invoiceCount} invoices</p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-foreground)] ml-2 whitespace-nowrap">
                      {formatCurrency(vendor.totalSpend)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Project Budget Bars */}
        {data.projectStats.length > 0 && (
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Project Budget Tracking</h2>
            <div className="space-y-4">
              {data.projectStats.map((p) => {
                const pct = p.budget ? Math.min((p.totalSpend / p.budget) * 100, 100) : 0
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-[var(--color-foreground)]">{p.name}</span>
                      <span className="text-[var(--color-muted-foreground)]">
                        {formatCurrency(p.totalSpend)}
                        {p.budget && ` / ${formatCurrency(p.budget)}`}
                      </span>
                    </div>
                    {p.budget && (
                      <div className="w-full h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : p.color || '#6366f1',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
