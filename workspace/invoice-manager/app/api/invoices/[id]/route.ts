import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: true,
        category: true,
        vendor: true,
        lineItems: true,
        receipts: true,
        reconciliations: {
          include: { bankTransaction: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.invoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const updateData: any = { ...body }

    if (body.invoiceDate) updateData.invoiceDate = new Date(body.invoiceDate)
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate)
    if (body.paidDate) updateData.paidDate = new Date(body.paidDate)

    // Upsert vendor
    if (body.vendorName && !body.vendorId) {
      const vendor = await prisma.vendor.upsert({
        where: { name: body.vendorName },
        create: { name: body.vendorName },
        update: {},
      })
      updateData.vendorId = vendor.id
    }

    // Handle line items if provided: delete then recreate
    if (body.lineItems !== undefined) {
      await prisma.lineItem.deleteMany({ where: { invoiceId: id } })
      delete updateData.lineItems
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...updateData,
        // Recreate line items after clearing above
        ...(body.lineItems !== undefined && body.lineItems.length > 0
          ? {
              lineItems: {
                create: body.lineItems.map((item: any) => ({
                  description: item.description,
                  quantity: item.quantity ?? 1,
                  unitPrice: item.unitPrice ?? 0,
                  amount: item.amount ?? 0,
                  tax: item.tax ?? null,
                })),
              },
            }
          : {}),
      },
      include: {
        project: true,
        category: true,
        vendor: true,
        lineItems: true,
        receipts: true,
      },
    })

    // Audit logs for changed fields
    const auditFields = ['status', 'categoryName', 'projectId', 'amount', 'dueDate'] as const
    for (const field of auditFields) {
      const oldVal = String((existing as any)[field] ?? '')
      const newVal = String((body as any)[field] ?? '')
      if (body[field] !== undefined && oldVal !== newVal) {
        await prisma.auditLog.create({
          data: {
            invoiceId: id,
            action: `${field}_changed`,
            field,
            oldValue: oldVal,
            newValue: newVal,
          },
        })
      }
    }

    // Auto-categorization learning: update vendor's defaultCategory when user sets a category
    if (body.categoryName && invoice.vendorId) {
      await prisma.vendor.update({
        where: { id: invoice.vendorId },
        data: { defaultCategory: body.categoryName },
      })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('PATCH /api/invoices/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.invoice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
