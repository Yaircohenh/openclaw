import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, 'MMM d, yyyy')
}

export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'yyyy-MM-dd')
}

export function isOverdue(dueDate: Date | string | null | undefined, status: string): boolean {
  if (!dueDate || status === 'paid') return false
  const d = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  return d < new Date()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'unpaid':
      return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'overdue':
      return 'text-red-700 bg-red-50 border-red-200'
    case 'cancelled':
      return 'text-gray-600 bg-gray-100 border-gray-200'
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200'
  }
}

export function calculateInvoiceStatus(
  status: string,
  dueDate: Date | string | null | undefined
): string {
  if (status === 'paid' || status === 'cancelled') return status
  if (isOverdue(dueDate, status)) return 'overdue'
  return 'unpaid'
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `INV-${year}-${random}`
}
