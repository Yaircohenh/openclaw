import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const { ids, action, data } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No invoice IDs provided' }, { status: 400 })
    }

    let updateData: any = {}

    switch (action) {
      case 'mark_paid':
        updateData = {
          status: 'paid',
          paidDate: new Date(),
          paymentMethod: data?.paymentMethod || 'unspecified',
        }
        break
      case 'mark_unpaid':
        updateData = { status: 'unpaid', paidDate: null }
        break
      case 'assign_project':
        if (!data?.projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
        updateData = { projectId: data.projectId }
        break
      case 'assign_category':
        if (!data?.categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })
        updateData = { categoryId: data.categoryId, categoryName: data.categoryName }
        break
      case 'delete':
        await prisma.invoice.deleteMany({ where: { id: { in: ids } } })
        return NextResponse.json({ success: true, count: ids.length })
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const result = await prisma.invoice.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 })
  }
}
