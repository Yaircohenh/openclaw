import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const InvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  vendorName: z.string().optional(),
  vendorId: z.string().optional(),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  paidDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().default('USD'),
  tax: z.number().optional(),
  totalAmount: z.number().optional(),
  status: z.enum(['unpaid', 'paid', 'overdue', 'cancelled']).default('unpaid'),
  description: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().default(1),
    unitPrice: z.number().default(0),
    amount: z.number().default(0),
    tax: z.number().optional(),
  })).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const projectId = searchParams.get('projectId') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const vendorId = searchParams.get('vendorId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { vendorName: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (status) {
      if (status === 'overdue') {
        where.AND = [
          { status: 'unpaid' },
          { dueDate: { lt: new Date() } },
        ]
      } else {
        where.status = status
      }
    }

    if (projectId) where.projectId = projectId
    if (categoryId) where.categoryId = categoryId
    if (vendorId) where.vendorId = vendorId

    if (startDate || endDate) {
      where.invoiceDate = {}
      if (startDate) where.invoiceDate.gte = new Date(startDate)
      if (endDate) where.invoiceDate.lte = new Date(endDate)
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true } },
          category: { select: { id: true, name: true, color: true } },
          vendor: { select: { id: true, name: true } },
          lineItems: true,
          receipts: { select: { id: true, fileName: true } },
          reconciliations: { select: { id: true, status: true } },
        },
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({ invoices, total, page, limit })
  } catch (error) {
    console.error('GET /api/invoices error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = InvoiceSchema.parse(body)

    const { lineItems, ...invoiceData } = data

    // Upsert vendor if name provided
    let vendorId = invoiceData.vendorId
    if (invoiceData.vendorName && !vendorId) {
      const vendor = await prisma.vendor.upsert({
        where: { name: invoiceData.vendorName },
        create: { name: invoiceData.vendorName },
        update: {},
      })
      vendorId = vendor.id
    }

    const invoiceDate = invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : undefined
    const totalAmount = invoiceData.totalAmount || invoiceData.amount || 0

    // Duplicate detection: same vendor + amount + invoice date
    let isDuplicate = false
    let duplicateOfId: string | undefined
    if (vendorId && totalAmount > 0 && invoiceDate) {
      const startOfDay = new Date(invoiceDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(invoiceDate)
      endOfDay.setHours(23, 59, 59, 999)

      const potentialDuplicate = await prisma.invoice.findFirst({
        where: {
          vendorId,
          totalAmount,
          invoiceDate: { gte: startOfDay, lte: endOfDay },
        },
      })
      if (potentialDuplicate) {
        isDuplicate = true
        duplicateOfId = potentialDuplicate.id
      }
    }

    // Recurring invoice detection: same vendor sent same amount in a previous month
    let isRecurring = false
    let recurringGroupId: string | undefined
    if (vendorId && totalAmount > 0) {
      const recentSimilar = await prisma.invoice.findMany({
        where: {
          vendorId,
          totalAmount: { gte: totalAmount * 0.95, lte: totalAmount * 1.05 },
        },
        orderBy: { invoiceDate: 'desc' },
        take: 3,
      })

      if (recentSimilar.length >= 2) {
        isRecurring = true
        // Use existing recurringGroupId or id of the oldest one
        const withGroup = recentSimilar.find(i => i.recurringGroupId)
        recurringGroupId = withGroup?.recurringGroupId || recentSimilar[recentSimilar.length - 1].id

        // Mark older ones as recurring if not already
        for (const old of recentSimilar) {
          if (!old.isRecurring) {
            await prisma.invoice.update({
              where: { id: old.id },
              data: { isRecurring: true, recurringGroupId: recurringGroupId },
            })
          }
        }
      }
    }

    // Auto-categorization: look up vendor's most common category
    let autoCategoryId = invoiceData.categoryId
    let autoCategoryName = invoiceData.categoryName
    if (!autoCategoryId && vendorId) {
      const vendorRecord = await prisma.vendor.findUnique({ where: { id: vendorId } })
      if (vendorRecord?.defaultCategory) {
        autoCategoryName = vendorRecord.defaultCategory
        const cat = await prisma.category.findFirst({ where: { name: vendorRecord.defaultCategory } })
        if (cat) autoCategoryId = cat.id
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceData,
        vendorId,
        categoryId: autoCategoryId,
        categoryName: autoCategoryName,
        invoiceDate,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
        paidDate: invoiceData.paidDate ? new Date(invoiceData.paidDate) : undefined,
        totalAmount,
        isDuplicate,
        duplicateOfId,
        isRecurring,
        recurringGroupId,
        lineItems: lineItems ? { create: lineItems } : undefined,
      },
      include: {
        project: true,
        category: true,
        vendor: true,
        lineItems: true,
      },
    })

    // Update vendor stats and defaultCategory if a category was assigned
    if (vendorId) {
      const updateVendor: any = {
        totalSpend: { increment: invoice.totalAmount },
        invoiceCount: { increment: 1 },
      }
      if (autoCategoryName) updateVendor.defaultCategory = autoCategoryName
      await prisma.vendor.update({ where: { id: vendorId }, data: updateVendor })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        invoiceId: invoice.id,
        action: 'created',
        newValue: JSON.stringify({
          status: invoice.status,
          amount: invoice.totalAmount,
          isDuplicate,
          isRecurring,
        }),
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('POST /api/invoices error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
