import fs from 'fs'
import path from 'path'

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid issues with pdf-parse
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as any).default ?? pdfParseModule
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    return data.text
  } catch (error) {
    console.error('PDF parsing error:', error)
    return ''
  }
}

export async function extractTextFromImage(filePath: string): Promise<string> {
  try {
    const Tesseract = await import('tesseract.js')
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {},
    })
    return text
  } catch (error) {
    console.error('OCR error:', error)
    return ''
  }
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  
  if (ext === '.pdf') {
    return extractTextFromPDF(filePath)
  } else if (['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif'].includes(ext)) {
    return extractTextFromImage(filePath)
  }
  
  return ''
}

export function saveUploadedFile(
  buffer: Buffer,
  originalName: string,
  uploadDir: string
): { filePath: string; fileName: string } {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const timestamp = Date.now()
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = `${timestamp}-${safeName}`
  const filePath = path.join(uploadDir, fileName)

  fs.writeFileSync(filePath, buffer)

  return { filePath, fileName }
}
