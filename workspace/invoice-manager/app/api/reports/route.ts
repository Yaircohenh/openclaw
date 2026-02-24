import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  exportInvoicesToExcel,
  exportProjectReport,
  exportCashFlowReport,
  exportTaxReport,
  exportReconciliationReport,
} from '@/lib/excelExporter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'invoices'
    const projectId = searchParams.get('projectId') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const status = searchParams.get('status') || ''

    const where: any = {}
    if (projectId) where.projectId = projectId
    if (categoryId) where.categoryId = categoryId
    if (status) where.status = status
    if (startDate || endDate) {
      where.invoiceDate = {}
      if (startDate) where.invoiceDate.gte = new Date(startDate)
      if (endDate) where.invoiceDate.lte = new Date(endDate)
    }

    let buffer: Buffer
    let filename: string
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    if (type === 'invoices') {
      const invoices = await prisma.invoice.findMany({
        where,
        include: { project: true, category: true, vendor: true },
        orderBy: { invoiceDate: 'desc' },
      })
      buffer = exportInvoicesToExcel(invoices)
      filename = `invoices-${Date.now()}.xlsx`

    } else if (type === 'project' && projectId) {
      const [project, invoices] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId } }),
        prisma.invoice.findMany({
          where: { projectId },
          include: { category: true, vendor: true },
          orderBy: { invoiceDate: 'desc' },
        }),
      ])
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      buffer = exportProjectReport(project, invoices)
      filename = `project-${project.name.replace(/\s+/g, '-')}-${Date.now()}.xlsx`

    } else if (type === 'cashflow') {
      const invoices = await prisma.invoice.findMany({
        where: {
          ...where,
          status: { not: 'cancelled' },
          invoiceDate: { not: null },
        },
        select: { invoiceDate: true, totalAmount: true, status: true },
        orderBy: { invoiceDate: 'asc' },
      })

      const monthlyMap: Record<string, { expenses: number; paid: number }> = {}
      for (const inv of invoices) {
        if (!inv.invoiceDate) continue
        const period = inv.invoiceDate.toISOString().substring(0, 7)
        if (!monthlyMap[period]) monthlyMap[period] = { expenses: 0, paid: 0 }
        monthlyMap[period].expenses += inv.totalAmount
        if (inv.status === 'paid') monthlyMap[period].paid += inv.totalAmount
      }

      const data = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, vals]) => ({ period, ...vals }))

      buffer = exportCashFlowReport(data)
      filename = `cashflow-${Date.now()}.xlsx`

    } else if (type === 'tax') {
      const invoices = await prisma.invoice.findMany({
        where: { ...where, status: { not: 'cancelled' } },
        include: { category: true, vendor: true },
        orderBy: { invoiceDate: 'desc' },
      })
      buffer = exportTaxReport(invoices)
      filename = `tax-report-${Date.now()}.xlsx`

    } else if (type === 'reconciliation') {
      const [matched, unmatchedInvoices, unmatchedTxns] = await Promise.all([
        prisma.reconciliation.findMany({
          include: {
            invoice: { select: { invoiceNumber: true, vendorName: true, totalAmount: true } },
            bankTransaction: { select: { description: true, amount: true, transactionDate: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.invoice.findMany({
          where: { reconciliations: { none: {} }, status: 'unpaid' },
          select: {
            invoiceNumber: true, vendorName: true, totalAmount: true,
            invoiceDate: true, dueDate: true,
          },
        }),
        prisma.bankTransaction.findMany({
          where: { reconciliations: { none: {} } },
          select: { transactionDate: true, description: true, amount: true, reference: true },
          orderBy: { transactionDate: 'desc' },
          take: 500,
        }),
      ])
      buffer = exportReconciliationReport(matched, unmatchedInvoices, unmatchedTxns)
      filename = `reconciliation-${Date.now()}.xlsx`

    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
