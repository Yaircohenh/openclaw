import * as XLSX from 'xlsx'
import { format } from 'date-fns'

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  try { return format(new Date(d), 'MM/dd/yyyy') } catch { return '' }
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toFixed(2)
}

export function exportInvoicesToExcel(invoices: any[]): Buffer {
  const rows = invoices.map(inv => ({
    'Invoice #': inv.invoiceNumber || '',
    Vendor: inv.vendorName || inv.vendor?.name || '',
    Project: inv.project?.name || '',
    Category: inv.categoryName || inv.category?.name || '',
    'Invoice Date': fmtDate(inv.invoiceDate),
    'Due Date': fmtDate(inv.dueDate),
    'Paid Date': fmtDate(inv.paidDate),
    Amount: inv.amount || 0,
    Tax: inv.tax || 0,
    'Total Amount': inv.totalAmount || inv.amount || 0,
    Currency: inv.currency || 'USD',
    Status: inv.status || '',
    'Payment Method': inv.paymentMethod || '',
    Description: inv.description || '',
    Notes: inv.notes || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 10 },
    { wch: 15 }, { wch: 35 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Invoices')

  // Summary sheet
  const totalAmount = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0)
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0)
  const unpaidAmount = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + (i.totalAmount || 0), 0)

  const summaryData = [
    ['Invoice Export Summary'],
    ['Generated', fmtDate(new Date())],
    [''],
    ['Total Invoices', invoices.length],
    ['Total Amount', fmtCurrency(totalAmount)],
    ['Paid Amount', fmtCurrency(paidAmount)],
    ['Unpaid Amount', fmtCurrency(unpaidAmount)],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

export function exportProjectReport(project: any, invoices: any[]): Buffer {
  const wb = XLSX.utils.book_new()

  const totalSpend = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
  const budgetRemaining = project.budget ? project.budget - totalSpend : null

  const summary = [
    ['Project Report', ''],
    ['', ''],
    ['Project Name', project.name],
    ['Client', project.client || ''],
    ['Status', project.status],
    ['Budget', fmtCurrency(project.budget)],
    ['Total Spent', fmtCurrency(totalSpend)],
    ['Budget Remaining', budgetRemaining != null ? fmtCurrency(budgetRemaining) : 'N/A'],
    ['Budget Used %', project.budget ? `${((totalSpend / project.budget) * 100).toFixed(1)}%` : 'N/A'],
    ['Start Date', fmtDate(project.startDate)],
    ['End Date', fmtDate(project.endDate)],
    ['Invoice Count', invoices.length],
  ]

  const summaryWs = XLSX.utils.aoa_to_sheet(summary)
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  const invoiceRows = invoices.map(inv => ({
    'Invoice #': inv.invoiceNumber || '',
    Vendor: inv.vendorName || '',
    Category: inv.categoryName || '',
    Date: fmtDate(inv.invoiceDate),
    'Due Date': fmtDate(inv.dueDate),
    Amount: inv.totalAmount || 0,
    Status: inv.status || '',
    Description: inv.description || '',
  }))

  const invoiceWs = XLSX.utils.json_to_sheet(invoiceRows)
  invoiceWs['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 35 },
  ]
  XLSX.utils.book_append_sheet(wb, invoiceWs, 'Invoices')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

export function exportCashFlowReport(data: Array<{ period: string; expenses: number; paid: number }>): Buffer {
  const wb = XLSX.utils.book_new()

  const rows = data.map(row => ({
    Period: row.period,
    'Total Invoiced': fmtCurrency(row.expenses),
    'Amount Paid': fmtCurrency(row.paid),
    'Amount Unpaid': fmtCurrency((row.expenses || 0) - (row.paid || 0)),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

export function exportTaxReport(invoices: any[]): Buffer {
  const wb = XLSX.utils.book_new()

  // Group by category
  const byCategory: Record<string, { invoices: any[]; total: number; tax: number }> = {}
  for (const inv of invoices) {
    const cat = inv.categoryName || inv.category?.name || 'Uncategorized'
    if (!byCategory[cat]) byCategory[cat] = { invoices: [], total: 0, tax: 0 }
    byCategory[cat].invoices.push(inv)
    byCategory[cat].total += inv.totalAmount || 0
    byCategory[cat].tax += inv.tax || 0
  }

  // Category summary sheet
  const summaryRows = Object.entries(byCategory).map(([cat, data]) => ({
    Category: cat,
    'Invoice Count': data.invoices.length,
    'Total Amount': fmtCurrency(data.total),
    'Total Tax': fmtCurrency(data.tax),
    'Net (ex tax)': fmtCurrency(data.total - data.tax),
  }))

  const grandTotal = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0)
  const grandTax = invoices.reduce((s, i) => s + (i.tax || 0), 0)

  summaryRows.push({
    Category: 'TOTAL',
    'Invoice Count': invoices.length,
    'Total Amount': fmtCurrency(grandTotal),
    'Total Tax': fmtCurrency(grandTax),
    'Net (ex tax)': fmtCurrency(grandTotal - grandTax),
  })

  const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'By Category')

  // All invoices detail
  const detailRows = invoices.map(inv => ({
    'Invoice #': inv.invoiceNumber || '',
    Vendor: inv.vendorName || inv.vendor?.name || '',
    Category: inv.categoryName || inv.category?.name || '',
    Date: fmtDate(inv.invoiceDate),
    Amount: fmtCurrency(inv.amount),
    Tax: fmtCurrency(inv.tax),
    Total: fmtCurrency(inv.totalAmount),
    Currency: inv.currency || 'USD',
    Status: inv.status || '',
    Description: inv.description || '',
  }))

  const detailWs = XLSX.utils.json_to_sheet(detailRows)
  detailWs['!cols'] = [
    { wch: 14 }, { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 35 },
  ]
  XLSX.utils.book_append_sheet(wb, detailWs, 'Invoice Detail')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

export function exportReconciliationReport(
  matched: any[],
  unmatchedInvoices: any[],
  unmatchedTxns: any[]
): Buffer {
  const wb = XLSX.utils.book_new()

  const matchedRows = matched.map(r => ({
    'Invoice #': r.invoice?.invoiceNumber || '',
    'Invoice Vendor': r.invoice?.vendorName || '',
    'Invoice Amount': fmtCurrency(r.invoice?.totalAmount),
    'Transaction Date': fmtDate(r.bankTransaction?.transactionDate),
    'Transaction Description': r.bankTransaction?.description || '',
    'Transaction Amount': fmtCurrency(r.bankTransaction?.amount),
    Status: 'Matched',
    Notes: r.notes || '',
  }))
  const matchedWs = XLSX.utils.json_to_sheet(matchedRows)
  matchedWs['!cols'] = [
    { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 16 },
    { wch: 35 }, { wch: 18 }, { wch: 10 }, { wch: 25 },
  ]
  XLSX.utils.book_append_sheet(wb, matchedWs, 'Matched')

  const unmatchedInvRows = unmatchedInvoices.map(inv => ({
    'Invoice #': inv.invoiceNumber || '',
    Vendor: inv.vendorName || '',
    Amount: fmtCurrency(inv.totalAmount),
    'Invoice Date': fmtDate(inv.invoiceDate),
    'Due Date': fmtDate(inv.dueDate),
    Status: 'Unmatched',
  }))
  const unmatchedInvWs = XLSX.utils.json_to_sheet(unmatchedInvRows)
  XLSX.utils.book_append_sheet(wb, unmatchedInvWs, 'Unmatched Invoices')

  const unmatchedTxnRows = unmatchedTxns.map(t => ({
    Date: fmtDate(t.transactionDate),
    Description: t.description || '',
    Amount: fmtCurrency(t.amount),
    Reference: t.reference || '',
    Status: 'Unmatched',
  }))
  const unmatchedTxnWs = XLSX.utils.json_to_sheet(unmatchedTxnRows)
  XLSX.utils.book_append_sheet(wb, unmatchedTxnWs, 'Unmatched Transactions')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
