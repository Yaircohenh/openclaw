import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter } as any)

const DEFAULT_CATEGORIES = [
  { name: 'Software', color: '#6366f1', description: 'Software licenses, SaaS subscriptions', isDefault: true },
  { name: 'Hardware', color: '#8b5cf6', description: 'Computer hardware, devices, equipment', isDefault: true },
  { name: 'Services', color: '#06b6d4', description: 'Professional services, maintenance', isDefault: true },
  { name: 'Consulting', color: '#0ea5e9', description: 'Consulting and advisory fees', isDefault: true },
  { name: 'Marketing', color: '#f59e0b', description: 'Advertising, marketing, promotion', isDefault: true },
  { name: 'Office', color: '#84cc16', description: 'Office supplies and expenses', isDefault: true },
  { name: 'Travel', color: '#f97316', description: 'Travel, accommodation, transport', isDefault: true },
  { name: 'Legal', color: '#ef4444', description: 'Legal fees and compliance costs', isDefault: true },
  { name: 'Utilities', color: '#14b8a6', description: 'Electricity, internet, phone', isDefault: true },
  { name: 'Contractors', color: '#a78bfa', description: 'Freelancer and contractor payments', isDefault: true },
  { name: 'Insurance', color: '#fb7185', description: 'Business insurance premiums', isDefault: true },
  { name: 'Other', color: '#94a3b8', description: 'Miscellaneous expenses', isDefault: true },
]

const DEFAULT_SETTINGS = [
  { key: 'company_name', value: 'My Company', group: 'general' },
  { key: 'default_currency', value: 'USD', group: 'general' },
  { key: 'date_format', value: 'MM/DD/YYYY', group: 'general' },
  { key: 'fiscal_year_start', value: '01', group: 'general' },
  { key: 'imap_host', value: '', group: 'email' },
  { key: 'imap_port', value: '993', group: 'email' },
  { key: 'imap_user', value: '', group: 'email' },
  { key: 'imap_password', value: '', group: 'email' },
  { key: 'imap_tls', value: 'true', group: 'email' },
  { key: 'gdrive_client_id', value: '', group: 'gdrive' },
  { key: 'gdrive_client_secret', value: '', group: 'gdrive' },
  { key: 'gdrive_folder_id', value: '', group: 'gdrive' },
]

async function main() {
  console.log('Seeding database...')

  // Upsert categories
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      create: cat,
      update: { color: cat.color, description: cat.description },
    })
  }
  console.log(`✓ Seeded ${DEFAULT_CATEGORIES.length} categories`)

  // Upsert settings
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: setting,
      update: {}, // Don't overwrite existing user settings
    })
  }
  console.log(`✓ Seeded ${DEFAULT_SETTINGS.length} default settings`)

  console.log('Database seeded successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
