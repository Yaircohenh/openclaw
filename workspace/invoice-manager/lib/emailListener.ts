import imaps from 'imap-simple'
import { simpleParser } from 'mailparser'
import fs from 'fs'
import path from 'path'
import { prisma } from './prisma'
import { extractTextFromFile, saveUploadedFile } from './pdfParser'
import { extractInvoiceData } from './aiExtractor'

interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
}

let pollingInterval: NodeJS.Timeout | null = null

export async function startEmailListener(config: EmailConfig): Promise<void> {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }

  // Poll immediately then every 5 minutes
  await pollEmails(config)
  pollingInterval = setInterval(() => pollEmails(config), 5 * 60 * 1000)
}

export function stopEmailListener(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

async function pollEmails(config: EmailConfig): Promise<void> {
  try {
    const connection = await imaps.connect({
      imap: {
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: config.tls,
        authTimeout: 10000,
      },
    })

    await connection.openBox('INBOX')

    const searchCriteria = ['UNSEEN']
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT', ''],
      markSeen: false,
    }

    const messages = await connection.search(searchCriteria, fetchOptions)

    for (const message of messages) {
      await processEmailMessage(message)
    }

    await connection.end()
  } catch (error) {
    console.error('Email polling error:', error)
  }
}

async function processEmailMessage(message: any): Promise<void> {
  try {
    const all = message.parts.find((p: any) => p.which === '')
    if (!all) return

    const parsed = await simpleParser(all.body)
    const messageId = parsed.messageId || `email-${Date.now()}`

    // Check if already processed
    const existing = await prisma.emailQueue.findUnique({
      where: { messageId },
    })
    if (existing) return

    // Create queue entry
    const queueEntry = await prisma.emailQueue.create({
      data: {
        messageId,
        from: parsed.from?.text,
        subject: parsed.subject,
        receivedAt: parsed.date,
        status: 'processing',
        attachments: parsed.attachments?.length || 0,
      },
    })

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices')
    let processedCount = 0

    for (const attachment of parsed.attachments || []) {
      const ext = path.extname(attachment.filename || '').toLowerCase()
      if (!['.pdf', '.jpg', '.jpeg', '.png', '.tiff'].includes(ext)) continue

      try {
        const { filePath, fileName } = saveUploadedFile(
          attachment.content,
          attachment.filename || `attachment${ext}`,
          uploadDir
        )

        const text = await extractTextFromFile(filePath)
        const extracted = await extractInvoiceData(text)

        await prisma.invoice.create({
          data: {
            vendorName: extracted.vendorName,
            invoiceNumber: extracted.invoiceNumber,
            invoiceDate: extracted.invoiceDate ? new Date(extracted.invoiceDate) : undefined,
            dueDate: extracted.dueDate ? new Date(extracted.dueDate) : undefined,
            amount: extracted.amount || 0,
            currency: extracted.currency || 'USD',
            tax: extracted.tax,
            totalAmount: extracted.totalAmount || extracted.amount || 0,
            description: extracted.description,
            categoryName: extracted.category,
            source: 'email',
            emailId: messageId,
            emailFrom: parsed.from?.text,
            emailSubject: parsed.subject,
            emailDate: parsed.date,
            filePath,
            fileName,
            fileType: ext.replace('.', ''),
            extractionConfidence: extracted.confidence,
            rawExtractedText: text.substring(0, 5000),
            processingStatus: 'processed',
            lineItems: extracted.lineItems
              ? {
                  create: extracted.lineItems.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                  })),
                }
              : undefined,
          },
        })

        processedCount++
      } catch (err) {
        console.error('Error processing attachment:', err)
      }
    }

    await prisma.emailQueue.update({
      where: { id: queueEntry.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error processing email:', error)
  }
}
