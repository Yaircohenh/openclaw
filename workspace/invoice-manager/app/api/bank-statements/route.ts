import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseCSV, parseOFX } from '@/lib/bankParser'
import path from 'path'
import fs from 'fs'

export async function GET() {
  try {
    const statements = await prisma.bankStatement.findMany({
      include: { _count: { select: { transactions: true } } },
      orderBy: { uploadedAt: 'desc' },
    })
    return NextResponse.json(statements)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bankName = formData.get('bankName') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'statements')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(uploadDir, fileName)
    fs.writeFileSync(filePath, buffer)

    const ext = path.extname(file.name).toLowerCase()
    let transactions: any[] = []

    if (ext === '.csv') {
      transactions = parseCSV(filePath)
    } else if (ext === '.ofx' || ext === '.qfx') {
      const content = fs.readFileSync(filePath, 'utf-8')
      transactions = parseOFX(content)
    }

    const statement = await prisma.bankStatement.create({
      data: {
        fileName,
        filePath,
        bankName: bankName || undefined,
        transactions: {
          create: transactions.map(t => ({
            transactionDate: new Date(t.date),
            description: t.description,
            amount: t.amount,
            balance: t.balance,
            reference: t.reference,
            source: ext.replace('.', ''),
            bankName: bankName || undefined,
          })),
        },
      },
      include: {
        _count: { select: { transactions: true } },
        transactions: {
          take: 5,
          orderBy: { transactionDate: 'desc' },
        },
      },
    })

    return NextResponse.json(statement, { status: 201 })
  } catch (error) {
    console.error('POST /api/bank-statements error:', error)
    return NextResponse.json({ error: 'Failed to process bank statement' }, { status: 500 })
  }
}
