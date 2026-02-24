import { NextRequest, NextResponse } from 'next/server'
import { extractInvoiceData } from '@/lib/aiExtractor'
import { saveUploadedFile, extractTextFromFile } from '@/lib/pdfParser'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null

    let extractedText = text || ''

    if (file && !text) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
      const { filePath } = saveUploadedFile(buffer, file.name, uploadDir)
      extractedText = await extractTextFromFile(filePath)
    }

    if (!extractedText) {
      return NextResponse.json({ error: 'No text to extract from' }, { status: 400 })
    }

    const extracted = await extractInvoiceData(extractedText)

    return NextResponse.json({
      extracted,
      rawText: extractedText.substring(0, 2000),
    })
  } catch (error) {
    console.error('POST /api/ai-extract error:', error)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
