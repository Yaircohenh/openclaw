import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, format, startOfYear } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || ''
    const months = parseInt(searchParams.get('months') || '12')

    const where: any = {}
    if (projectId) where.projectId = projectId

    const now = new Date()
    const startDate = subMonths(startOfMonth(now), months - 1)

    // Summary stats
    const [totalUnpaid, totalOverdue, upcomingNext30, upcomingNext60, upcomingNext90] =
      await Promise.all([
        prisma.invoice.aggregate({
          where: { ...where, status: 'unpaid' },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.invoice.aggregate({
          where: {
            ...where,
            status: 'unpaid',
            dueDate: { lt: now },
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.invoice.aggregate({
          where: {
            ...where,
            status: 'unpaid',
            dueDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.invoice.aggregate({
          where: {
            ...where,
            status: 'unpaid',
            dueDate: { gte: now, lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.invoice.aggregate({
          where: {
            ...where,
            status: 'unpaid',
            dueDate: { gte: now, lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) },
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
      ])

    // Monthly data
    const monthlyData = []
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfMonth(subMonths(now, i))

      const [expenses, invoiceCount] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            ...where,
            invoiceDate: { gte: monthStart, lte: monthEnd },
            status: { not: 'cancelled' },
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.invoice.count({
          where: {
            ...where,
            invoiceDate: { gte: monthStart, lte: monthEnd },
            status: 'paid',
          },
        }),
      ])

      monthlyData.push({
        period: format(monthStart, 'MMM yyyy'),
        month: format(monthStart, 'yyyy-MM'),
        expenses: expenses._sum.totalAmount || 0,
        invoiceCount: expenses._count,
        paidCount: invoiceCount,
      })
    }

    // Category breakdown
    const categoryBreakdown = await prisma.invoice.groupBy({
      by: ['categoryName'],
      where: {
        ...where,
        invoiceDate: { gte: startOfYear(now) },
        status: { not: 'cancelled' },
      },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
    })

    // Top vendors
    const topVendors = await prisma.vendor.findMany({
      where: projectId
        ? { invoices: { some: { projectId } } }
        : {},
      orderBy: { totalSpend: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        totalSpend: true,
        invoiceCount: true,
      },
    })

    // Overdue invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        ...where,
        status: 'unpaid',
        dueDate: { lt: now },
      },
      include: {
        project: { select: { name: true } },
        vendor: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    })

    // Upcoming payments
    const upcomingInvoices = await prisma.invoice.findMany({
      where: {
        ...where,
        status: 'unpaid',
        dueDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        project: { select: { name: true } },
        vendor: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    })

    // Project breakdown
    const projectBreakdown = await prisma.project.findMany({
      where: { status: 'active' },
      include: {
        invoices: {
          where: { status: { not: 'cancelled' } },
          select: { totalAmount: true, status: true },
        },
      },
    })

    const projectStats = projectBreakdown.map(p => ({
      id: p.id,
      name: p.name,
      budget: p.budget,
      totalSpend: p.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      color: p.color,
    }))

    return NextResponse.json({
      summary: {
        totalUnpaid: totalUnpaid._sum.totalAmount || 0,
        unpaidCount: totalUnpaid._count,
        totalOverdue: totalOverdue._sum.totalAmount || 0,
        overdueCount: totalOverdue._count,
        upcoming30: upcomingNext30._sum.totalAmount || 0,
        upcoming30Count: upcomingNext30._count,
        upcoming60: upcomingNext60._sum.totalAmount || 0,
        upcoming90: upcomingNext90._sum.totalAmount || 0,
      },
      monthlyData,
      categoryBreakdown: categoryBreakdown.map(c => ({
        name: c.categoryName || 'Uncategorized',
        amount: c._sum.totalAmount || 0,
        count: c._count,
      })),
      topVendors,
      overdueInvoices,
      upcomingInvoices,
      projectStats,
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
