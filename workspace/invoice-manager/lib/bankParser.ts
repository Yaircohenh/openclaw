import fs from 'fs'

export interface BankTransactionRaw {
  date: string
  description: string
  amount: number
  balance?: number
  reference?: string
}

// Normalize various date formats to YYYY-MM-DD
function normalizeDate(raw: string): string {
  if (!raw) return ''
  const s = raw.trim()

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)

  // OFX format: YYYYMMDDHHMMSS or YYYYMMDD
  if (/^\d{8}/.test(s) && !s.includes('/') && !s.includes('-')) {
    return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`
  }

  // US format: MM/DD/YYYY or M/D/YYYY
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`

  // EU format: DD/MM/YYYY or D.M.YYYY
  const euMatch = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (euMatch) return `${euMatch[3]}-${euMatch[2].padStart(2, '0')}-${euMatch[1].padStart(2, '0')}`

  // DD-Mon-YYYY: e.g. 15-Jan-2024
  const monMatch = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})/)
  if (monMatch) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    }
    const m = months[monMatch[2].toLowerCase()]
    if (m) return `${monMatch[3]}-${m}-${monMatch[1].padStart(2, '0')}`
  }

  // Fallback: try JS Date parse
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10)

  return s
}

function parseAmount(raw: string): number {
  if (!raw) return NaN
  const cleaned = raw.trim().replace(/[^0-9.,()\-]/g, '')
  // Handle parentheses as negative: (100.00)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    return -parseFloat(cleaned.slice(1, -1).replace(',', ''))
  }
  // European format: 1.234,56
  if (/\d+\.\d{3},\d{2}$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  return parseFloat(cleaned.replace(/,/g, ''))
}

export function parseCSV(filePath: string): BankTransactionRaw[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split(/\r?\n/).filter(l => l.trim())

  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(h =>
    h.trim().toLowerCase().replace(/^["']|["']$/g, '')
  )

  const transactions: BankTransactionRaw[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < 2) continue

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').replace(/^["']|["']$/g, '').trim()
    })

    const dateField =
      row['date'] || row['transaction date'] || row['posted date'] ||
      row['value date'] || row['posting date'] || row['trans date'] || ''

    const descField =
      row['description'] || row['memo'] || row['payee'] || row['narrative'] ||
      row['details'] || row['transaction description'] || row['particulars'] || ''

    // Handle separate debit/credit columns
    let amount: number
    if (row['amount'] !== undefined && row['amount'] !== '') {
      amount = parseAmount(row['amount'])
    } else if (row['debit'] !== undefined || row['credit'] !== undefined) {
      const debit = parseAmount(row['debit'] || '0') || 0
      const credit = parseAmount(row['credit'] || '0') || 0
      amount = credit - debit
    } else {
      continue
    }

    if (!dateField || !descField) continue
    if (isNaN(amount)) continue

    const balanceField = row['balance'] || row['running balance'] || row['closing balance'] || ''
    const refField = row['reference'] || row['check number'] || row['cheque number'] || row['ref'] || ''

    transactions.push({
      date: normalizeDate(dateField),
      description: descField,
      amount,
      balance: balanceField ? parseAmount(balanceField) : undefined,
      reference: refField || undefined,
    })
  }

  return transactions
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function parseOFX(content: string): BankTransactionRaw[] {
  const transactions: BankTransactionRaw[] = []

  // Match both SGML and XML style OFX transaction blocks
  const transactionBlocks =
    content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ||
    content.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ||
    []

  for (const block of transactionBlocks) {
    const getField = (tag: string): string => {
      const match = block.match(new RegExp(`<${tag}>([^<\n\r]+)`, 'i'))
      return match ? match[1].trim() : ''
    }

    const dateStr = getField('DTPOSTED') || getField('DTUSER')
    const amountStr = getField('TRNAMT')
    const description = getField('NAME') || getField('MEMO') || getField('PAYEE')
    const reference = getField('FITID') || getField('REFNUM') || getField('CHECKNUM')

    if (!dateStr || !description) continue

    const amount = parseFloat(amountStr || '0')
    if (isNaN(amount)) continue

    transactions.push({
      date: normalizeDate(dateStr),
      description,
      amount,
      reference: reference || undefined,
    })
  }

  return transactions
}
