import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        invoices: {
          include: {
            category: true,
            vendor: true,
            receipts: { select: { id: true } },
          },
          orderBy: { invoiceDate: 'desc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const totalSpend = project.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const paidAmount = project.invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

    return NextResponse.json({
      ...project,
      totalSpend,
      paidAmount,
      budgetRemaining: project.budget ? project.budget - totalSpend : null,
      budgetUsedPercent: project.budget ? Math.round((totalSpend / project.budget) * 100) : null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.client !== undefined) updateData.client = body.client
    if (body.budget !== undefined) updateData.budget = parseFloat(body.budget)
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.description !== undefined) updateData.description = body.description
    if (body.color !== undefined) updateData.color = body.color

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(project)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Unassign invoices first
    await prisma.invoice.updateMany({
      where: { projectId: id },
      data: { projectId: null },
    })

    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
