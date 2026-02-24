import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  if (la === lb) return 1
  if (la.includes(lb) || lb.includes(la)) return 0.8
  // Word overlap
  const wordsA = new Set(la.split(/\W+/).filter(w => w.length > 2))
  const wordsB = new Set(lb.split(/\W+/).filter(w => w.length > 2))
  let overlap = 0
  for (const w of wordsA) if (wordsB.has(w)) overlap++
  const total = Math.max(wordsA.size, wordsB.size)
  return total > 0 ? overlap / total : 0
}

function dateSimilarity(dateA: Date | null | undefined, dateB: Date | null | undefined): number {
  if (!dateA || !dateB) return 0.5 // neutral if missing
  const diffDays = Math.abs((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return 1
  if (diffDays <= 5) return 0.85
  if (diffDays <= 14) return 0.6
  if (diffDays <= 30) return 0.3
  return 0
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statementId = searchParams.get('statementId') || ''

    // Get unmatched invoices
    const unmatchedInvoices = await prisma.invoice.findMany({
      where: {
        status: 'unpaid',
        reconciliations: { none: {} },
      },
      select: {
        id: true,
        invoiceNumber: true,
        vendorName: true,
        totalAmount: true,
        dueDate: true,
        invoiceDate: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    })

    // Get unmatched bank transactions
    const unmatchedTxns = await prisma.bankTransaction.findMany({
      where: {
        ...(statementId ? { statementId } : {}),
        reconciliations: { none: {} },
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    })

    // Get existing reconciliations
    const reconciliations = await prisma.reconciliation.findMany({
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true, vendorName: true, totalAmount: true },
        },
        bankTransaction: {
          select: { id: true, description: true, amount: true, transactionDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Multi-factor matching: amount + vendor name + date proximity
    const suggestions: Array<{ invoiceId: string; transactionId: string; score: number }> = []
    for (const inv of unmatchedInvoices.slice(0, 30)) {
      for (const txn of unmatchedTxns.slice(0, 100)) {
        const txnAmt = Math.abs(txn.amount)
        const invAmt = inv.totalAmount

        // Amount score (highest weight)
        let amountScore = 0
        const amountDiff = Math.abs(txnAmt - invAmt)
        if (amountDiff < 0.01) amountScore = 1
        else if (amountDiff < 0.5) amountScore = 0.95
        else if (amountDiff < 1) amountScore = 0.85
        else if (amountDiff < 5) amountScore = 0.6
        else if (amountDiff < 20) amountScore = 0.3
        else if (amountDiff / Math.max(invAmt, 1) < 0.02) amountScore = 0.7 // within 2%
        else continue // skip poor amount matches early

        // Vendor name vs transaction description similarity
        const vendorScore = stringSimilarity(inv.vendorName || '', txn.description)

        // Date proximity: compare invoice date or due date to transaction date
        const dateScore = Math.max(
          dateSimilarity(inv.dueDate, txn.transactionDate),
          dateSimilarity(inv.invoiceDate, txn.transactionDate)
        )

        // Weighted composite score
        const score = amountScore * 0.6 + vendorScore * 0.25 + dateScore * 0.15

        if (score > 0.45) {
          suggestions.push({ invoiceId: inv.id, transactionId: txn.id, score })
        }
      }
    }

    suggestions.sort((a, b) => b.score - a.score)

    return NextResponse.json({
      unmatchedInvoices,
      unmatchedTransactions: unmatchedTxns,
      reconciliations,
      suggestions: suggestions.slice(0, 30),
    })
  } catch (error) {
    console.error('GET /api/reconciliation error:', error)
    return NextResponse.json({ error: 'Failed to fetch reconciliation data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, bankTransactionId, notes, markPaid } = await request.json()

    if (!invoiceId && !bankTransactionId) {
      return NextResponse.json({ error: 'invoiceId or bankTransactionId required' }, { status: 400 })
    }

    const reconciliation = await prisma.reconciliation.create({
      data: {
        invoiceId: invoiceId || undefined,
        bankTransactionId: bankTransactionId || undefined,
        status: 'matched',
        notes,
      },
      include: {
        invoice: true,
        bankTransaction: true,
      },
    })

    // Only mark invoice as paid if the caller explicitly requests it
    if (invoiceId && markPaid === true) {
      const txn = bankTransactionId
        ? await prisma.bankTransaction.findUnique({ where: { id: bankTransactionId } })
        : null
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidDate: txn?.transactionDate ?? new Date(),
        },
      })
    }

    return NextResponse.json(reconciliation, { status: 201 })
  } catch (error) {
    console.error('POST /api/reconciliation error:', error)
    return NextResponse.json({ error: 'Failed to create reconciliation' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    await prisma.reconciliation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete reconciliation' }, { status: 500 })
  }
}
