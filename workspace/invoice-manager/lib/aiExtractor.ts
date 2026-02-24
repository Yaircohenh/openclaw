import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ExtractedInvoice {
  vendorName?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  amount?: number
  currency?: string
  tax?: number
  totalAmount?: number
  description?: string
  projectName?: string
  category?: string
  lineItems?: Array<{
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }>
  confidence?: number
}

export async function extractInvoiceData(text: string): Promise<ExtractedInvoice> {
  const prompt = `You are an expert invoice data extractor. Extract structured data from the following invoice text.

Return a JSON object with these fields (use null for fields you cannot find):
- vendorName: company/vendor name
- invoiceNumber: invoice number/ID
- invoiceDate: invoice date in ISO format (YYYY-MM-DD)
- dueDate: payment due date in ISO format (YYYY-MM-DD)  
- amount: subtotal amount before tax (number)
- currency: 3-letter currency code (default USD)
- tax: tax amount (number)
- totalAmount: total amount including tax (number)
- description: brief description of goods/services
- projectName: project name if mentioned
- category: best category from: [Software, Hardware, Services, Consulting, Marketing, Office, Travel, Legal, Utilities, Other]
- lineItems: array of {description, quantity, unitPrice, amount}
- confidence: your confidence score 0-1

Invoice text:
${text}

Return ONLY valid JSON, no explanation.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('AI extraction error:', error)
    return { confidence: 0 }
  }
}

export async function suggestReceiptMatch(
  receiptData: { amount?: number; date?: string; vendor?: string },
  invoices: Array<{ id: string; amount: number; dueDate?: string; vendorName?: string }>
): Promise<Array<{ invoiceId: string; score: number }>> {
  const prompt = `Match this receipt to the most likely invoice.

Receipt:
- Amount: ${receiptData.amount}
- Date: ${receiptData.date}
- Vendor: ${receiptData.vendor}

Available invoices:
${invoices
  .map(
    (inv, i) =>
      `${i + 1}. ID:${inv.id} Amount:${inv.amount} Due:${inv.dueDate} Vendor:${inv.vendorName}`
  )
  .join('\n')}

Return JSON array: [{invoiceId: "...", score: 0-1}] for top 3 matches only. Return [] if no good matches.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') return []

    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}

export async function categorizeInvoice(
  vendorName: string,
  description: string,
  existingCategories: string[]
): Promise<string> {
  const prompt = `Categorize this invoice into one of the provided categories.

Vendor: ${vendorName}
Description: ${description}
Available categories: ${existingCategories.join(', ')}

Return only the category name, nothing else.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') return 'Other'

    const suggested = content.text.trim()
    return existingCategories.includes(suggested) ? suggested : 'Other'
  } catch {
    return 'Other'
  }
}
