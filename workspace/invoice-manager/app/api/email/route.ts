import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startEmailListener, stopEmailListener } from '@/lib/emailListener'

export async function GET() {
  try {
    const queue = await prisma.emailQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(queue)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch email queue' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'start') {
      // Settings are keyed as 'imap.xxx' but stored in group 'email' or 'imap'
      // Fetch all settings and use dot-notation keys
      const allSettings = await prisma.setting.findMany()
      const settingsMap: Record<string, string> = {}
      allSettings.forEach(s => { settingsMap[s.key] = s.value })

      if (!settingsMap['imap.host'] || !settingsMap['imap.user']) {
        return NextResponse.json(
          { error: 'IMAP not configured. Please configure host and email in Settings.' },
          { status: 400 }
        )
      }

      await startEmailListener({
        host: settingsMap['imap.host'],
        port: parseInt(settingsMap['imap.port'] || '993'),
        user: settingsMap['imap.user'],
        password: settingsMap['imap.password'] || '',
        tls: settingsMap['imap.tls'] !== 'false',
      })

      return NextResponse.json({ success: true, message: 'Email listener started' })
    } else if (action === 'stop') {
      stopEmailListener()
      return NextResponse.json({ success: true, message: 'Email listener stopped' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to control email listener' }, { status: 500 })
  }
}
