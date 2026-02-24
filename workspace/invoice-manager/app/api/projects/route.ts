import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const includeStats = searchParams.get('includeStats') === 'true'

    const where: any = {}
    if (status) where.status = status

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: { select: { invoices: true } },
        invoices: includeStats ? {
          select: { totalAmount: true, status: true },
        } : false,
      },
      orderBy: { createdAt: 'desc' },
    })

    const projectsWithStats = projects.map(p => {
      const invoices = (p as any).invoices || []
      const totalSpend = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
      const paidAmount = invoices
        .filter((inv: any) => inv.status === 'paid')
        .reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)

      return {
        ...p,
        totalSpend,
        paidAmount,
        invoiceCount: p._count.invoices,
        budgetRemaining: p.budget ? p.budget - totalSpend : null,
        budgetUsedPercent: p.budget ? Math.round((totalSpend / p.budget) * 100) : null,
      }
    })

    return NextResponse.json(projectsWithStats)
  } catch (error) {
    console.error('GET /api/projects error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const project = await prisma.project.create({
      data: {
        name: body.name,
        client: body.client,
        budget: body.budget ? parseFloat(body.budget) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: body.status || 'active',
        description: body.description,
        color: body.color || '#6366f1',
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('POST /api/projects error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
