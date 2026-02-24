import fs from 'fs'
import path from 'path'
import { format } from 'date-fns'
import { prisma } from './prisma'

interface DriveConfig {
  accessToken: string
  folderId?: string
}

async function driveRequest(
  accessToken: string,
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Drive API error ${res.status}: ${body}`)
  }
  return res.json()
}

// Create a folder in Google Drive (or find existing by name under parent)
async function ensureFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false${
      parentId ? ` and '${parentId}' in parents` : ''
    }`
  )
  const searchRes = await driveRequest(
    accessToken,
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { method: 'GET' }
  )

  if (searchRes.files && searchRes.files.length > 0) {
    return searchRes.files[0].id
  }

  // Create the folder
  const createRes = await driveRequest(
    accessToken,
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    }
  )

  return createRes.id
}

// Upload a file to Google Drive using multipart upload
async function uploadFile(
  accessToken: string,
  filePath: string,
  fileName: string,
  mimeType: string,
  parentFolderId: string
): Promise<{ id: string; webViewLink: string }> {
  const fileContent = fs.readFileSync(filePath)

  const metadata = JSON.stringify({
    name: fileName,
    parents: [parentFolderId],
  })

  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metaPart = `Content-Type: application/json\r\n\r\n${metadata}`
  const filePart = `Content-Type: ${mimeType}\r\n\r\n`

  const body = Buffer.concat([
    Buffer.from(delimiter + metaPart + delimiter + filePart),
    fileContent,
    Buffer.from(closeDelimiter),
  ])

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        'Content-Length': body.length.toString(),
      },
      body,
    }
  )

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Google Drive upload error ${res.status}: ${errBody}`)
  }

  return res.json()
}

function getMimeType(ext: string): string {
  const types: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.tiff': 'image/tiff',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return types[ext.toLowerCase()] || 'application/octet-stream'
}

export async function uploadInvoiceToGoogleDrive(
  config: DriveConfig,
  invoiceId: string
): Promise<{ fileId: string; fileUrl: string }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { vendor: true, project: true },
  })

  if (!invoice || !invoice.filePath) {
    throw new Error('Invoice or file not found')
  }

  if (!fs.existsSync(invoice.filePath)) {
    throw new Error(`File not found at path: ${invoice.filePath}`)
  }

  const { accessToken, folderId: rootFolderId } = config

  // Build folder structure: Root / Year / Month / Project|Vendor
  const invoiceDate = invoice.invoiceDate || invoice.createdAt
  const year = format(invoiceDate, 'yyyy')
  const month = format(invoiceDate, 'yyyy-MM')
  const subFolder = invoice.project?.name || invoice.vendorName || 'Uncategorized'

  const yearFolder = await ensureFolder(accessToken, year, rootFolderId)
  const monthFolder = await ensureFolder(accessToken, month, yearFolder)
  const subFolderWithName = subFolder.replace(/[/\\?%*:|"<>]/g, '-')
  const targetFolder = await ensureFolder(accessToken, subFolderWithName, monthFolder)

  const ext = path.extname(invoice.fileName || invoice.filePath)
  const mimeType = getMimeType(ext)
  const displayName = `${invoice.vendorName || 'Invoice'}-${invoice.invoiceNumber || invoiceId}${ext}`

  const { id: fileId, webViewLink } = await uploadFile(
    accessToken,
    invoice.filePath,
    displayName,
    mimeType,
    targetFolder
  )

  // Store Drive IDs in database
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { googleDriveId: fileId, googleDriveUrl: webViewLink },
  })

  return { fileId, fileUrl: webViewLink }
}

export async function uploadReceiptToGoogleDrive(
  config: DriveConfig,
  receiptId: string
): Promise<{ fileId: string; fileUrl: string }> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { invoice: { include: { project: true } } },
  })

  if (!receipt || !receipt.filePath) throw new Error('Receipt or file not found')
  if (!fs.existsSync(receipt.filePath)) throw new Error(`File not found: ${receipt.filePath}`)

  const { accessToken, folderId: rootFolderId } = config

  const now = receipt.uploadedAt
  const year = format(now, 'yyyy')
  const month = format(now, 'yyyy-MM')
  const subFolder = receipt.invoice?.project?.name || 'Receipts'

  const yearFolder = await ensureFolder(accessToken, year, rootFolderId)
  const monthFolder = await ensureFolder(accessToken, month, yearFolder)
  const targetFolder = await ensureFolder(accessToken, subFolder, monthFolder)

  const ext = path.extname(receipt.fileName)
  const mimeType = getMimeType(ext)
  const displayName = `receipt-${receiptId}${ext}`

  const { id: fileId, webViewLink } = await uploadFile(
    accessToken,
    receipt.filePath,
    displayName,
    mimeType,
    targetFolder
  )

  await prisma.receipt.update({
    where: { id: receiptId },
    data: { googleDriveId: fileId, googleDriveUrl: webViewLink },
  })

  return { fileId, fileUrl: webViewLink }
}

// Exchange authorization code for tokens using OAuth2
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  return res.json()
}

// Refresh access token using refresh token
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  return res.json()
}

// Get a valid access token (refresh if needed)
// Settings use dot-notation keys as stored by /api/settings
export async function getAccessToken(
  settings: Record<string, string>
): Promise<string> {
  const refreshToken = settings['gdrive.refreshToken']
  const clientId = settings['gdrive.clientId']
  const clientSecret = settings['gdrive.clientSecret']
  const accessToken = settings['gdrive.accessToken']
  const expiresAt = parseInt(settings['gdrive.tokenExpires'] || '0')

  if (accessToken && Date.now() < expiresAt - 60000) {
    return accessToken
  }

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Google Drive not configured. Please set up credentials in Settings.')
  }

  const { access_token, expires_in } = await refreshAccessToken(refreshToken, clientId, clientSecret)

  // Persist new token
  await prisma.setting.upsert({
    where: { key: 'gdrive.accessToken' },
    create: { key: 'gdrive.accessToken', value: access_token, group: 'gdrive' },
    update: { value: access_token },
  })
  await prisma.setting.upsert({
    where: { key: 'gdrive.tokenExpires' },
    create: { key: 'gdrive.tokenExpires', value: String(Date.now() + expires_in * 1000), group: 'gdrive' },
    update: { value: String(Date.now() + expires_in * 1000) },
  })

  return access_token
}
