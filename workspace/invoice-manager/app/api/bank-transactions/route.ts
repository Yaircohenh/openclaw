import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statementId = searchParams.get('statementId') || ''
    const unmatched = searchParams.get('unmatched') === 'true'

    const where: any = {}
    if (statementId) where.statementId = statementId
    if (unmatched) where.reconciliations = { none: {} }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: {
        reconciliations: {
          include: { invoice: { select: { id: true, invoiceNumber: true, vendorName: true } } },
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: 200,
    })

    return NextResponse.json(transactions)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
