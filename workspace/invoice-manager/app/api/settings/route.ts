import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_SETTINGS = {
  'imap.host': '',
  'imap.port': '993',
  'imap.user': '',
  'imap.password': '',
  'imap.tls': 'true',
  'gdrive.clientId': '',
  'gdrive.clientSecret': '',
  'gdrive.folderId': '',
  'company.name': '',
  'company.email': '',
  'company.address': '',
  'general.currency': 'USD',
  'general.dateFormat': 'MMM d, yyyy',
  'email.polling': 'false',
}

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
    settings.forEach(s => {
      settingsMap[s.key] = s.value
    })
    return NextResponse.json(settingsMap)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const updates = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value), group: key.split('.')[0] },
        update: { value: String(value) },
      })
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
