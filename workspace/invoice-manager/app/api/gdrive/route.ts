import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  uploadInvoiceToGoogleDrive,
  uploadReceiptToGoogleDrive,
  getAccessToken,
  exchangeCodeForTokens,
} from '@/lib/googleDrive'

async function getSettings(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany()
  return Object.fromEntries(settings.map(s => [s.key, s.value]))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // OAuth callback
  if (action === 'callback') {
    const code = searchParams.get('code')
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    const settings = await getSettings()
    const clientId = settings['gdrive.clientId']
    const clientSecret = settings['gdrive.clientSecret']
    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/gdrive?action=callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?gdrive=not_configured`
      )
    }

    try {
      const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)

      await Promise.all([
        prisma.setting.upsert({
          where: { key: 'gdrive.refreshToken' },
          create: { key: 'gdrive.refreshToken', value: tokens.refresh_token, group: 'gdrive' },
          update: { value: tokens.refresh_token },
        }),
        prisma.setting.upsert({
          where: { key: 'gdrive.accessToken' },
          create: { key: 'gdrive.accessToken', value: tokens.access_token, group: 'gdrive' },
          update: { value: tokens.access_token },
        }),
        prisma.setting.upsert({
          where: { key: 'gdrive.tokenExpires' },
          create: {
            key: 'gdrive.tokenExpires',
            value: String(Date.now() + tokens.expires_in * 1000),
            group: 'gdrive',
          },
          update: { value: String(Date.now() + tokens.expires_in * 1000) },
        }),
      ])

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?gdrive=connected`
      )
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?gdrive=error`
      )
    }
  }

  // Return connection status
  const settings = await getSettings()
  const hasRefreshToken = !!settings['gdrive.refreshToken']
  const hasClientId = !!settings['gdrive.clientId']
  return NextResponse.json({ connected: hasRefreshToken && hasClientId })
}

export async function POST(request: NextRequest) {
  try {
    const { action, invoiceId, receiptId } = await request.json()

    const settings = await getSettings()

    if (action === 'auth_url') {
      const clientId = settings['gdrive.clientId']
      if (!clientId) return NextResponse.json({ error: 'Client ID not configured' }, { status: 400 })
      const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/gdrive?action=callback`
      const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file')
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`
      return NextResponse.json({ authUrl })
    }

    const accessToken = await getAccessToken(settings)
    const folderId = settings['gdrive.folderId'] || undefined
    const config = { accessToken, folderId }

    if (action === 'upload_invoice' && invoiceId) {
      const result = await uploadInvoiceToGoogleDrive(config, invoiceId)
      return NextResponse.json(result)
    }

    if (action === 'upload_receipt' && receiptId) {
      const result = await uploadReceiptToGoogleDrive(config, receiptId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Google Drive API error:', error)
    return NextResponse.json({ error: error.message || 'Google Drive operation failed' }, { status: 500 })
  }
}
