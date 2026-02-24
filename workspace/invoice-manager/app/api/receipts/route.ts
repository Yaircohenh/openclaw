import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveUploadedFile, extractTextFromFile } from '@/lib/pdfParser'
import { suggestReceiptMatch } from '@/lib/aiExtractor'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unmatched = searchParams.get('unmatched') === 'true'

    const where: any = {}
    if (unmatched) where.invoiceId = null

    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true, vendorName: true, totalAmount: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(receipts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const invoiceId = formData.get('invoiceId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'receipts')

    const { filePath, fileName } = saveUploadedFile(buffer, file.name, uploadDir)

    // Extract text for AI matching
    const text = await extractTextFromFile(filePath)

    // Get AI suggestions if no invoice specified
    let matchSuggestions: any[] = []
    if (!invoiceId) {
      const unpaidInvoices = await prisma.invoice.findMany({
        where: { status: 'unpaid' },
        select: { id: true, totalAmount: true, dueDate: true, vendorName: true },
        take: 50,
      })

      matchSuggestions = await suggestReceiptMatch(
        { vendor: text.substring(0, 200) },
        unpaidInvoices.map(inv => ({
          id: inv.id,
          amount: inv.totalAmount,
          dueDate: inv.dueDate?.toISOString(),
          vendorName: inv.vendorName || undefined,
        }))
      )
    }

    const receipt = await prisma.receipt.create({
      data: {
        invoiceId: invoiceId || undefined,
        fileName,
        filePath,
        fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
        fileSize: buffer.length,
        isManualMatch: !!invoiceId,
      },
    })

    return NextResponse.json({
      receipt,
      suggestions: matchSuggestions,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/receipts error:', error)
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 })
  }
}
