# Invoice Manager

A full-stack invoice management and cash flow dashboard built with Next.js, TypeScript, Tailwind CSS, and SQLite.

## Features

- **Email Invoice Ingestion** — IMAP polling pulls PDF/image attachments, runs OCR/PDF parsing, and uses Claude AI to extract structured invoice data
- **Invoice Management** — Full CRUD with search, filter, sort, pagination, bulk actions, inline editing
- **Duplicate Detection** — Automatically flags invoices with same vendor + amount + date
- **Recurring Invoice Detection** — Identifies vendors sending similar amounts monthly
- **Auto-Categorization** — Learns from user categorization to auto-assign categories on future invoices
- **Project Management** — Track budgets, assign invoices, monitor burn rate
- **Receipt Pairing** — Upload receipts and match to invoices with AI suggestions
- **Bank Reconciliation** — Upload CSV/OFX statements, auto-match transactions to invoices with multi-factor scoring (amount + vendor name + date proximity)
- **Cash Flow Dashboard** — Charts, KPIs, overdue alerts, upcoming payments, top vendors
- **Google Drive Integration** — Upload invoices/receipts to Drive organized by year/month/project
- **Excel Reports** — Invoice export, project reports, cash flow, tax summary, reconciliation report
- **Dark Mode** — Full dark/light theme support

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Database**: SQLite via Prisma ORM + better-sqlite3 adapter
- **AI**: Anthropic Claude Haiku for invoice extraction, receipt matching, categorization
- **PDF/OCR**: pdf-parse + tesseract.js
- **Email**: imap-simple + mailparser
- **Charts**: Recharts
- **Excel**: XLSX (SheetJS)

## Quick Start

```bash
# Install dependencies
npm install

# Set up database (push schema + seed default categories)
npm run db:setup

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to the Dashboard.

## Environment Variables

Set in `.env.local`:

```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="your-key-here"
```

## Database Commands

```bash
npm run db:generate   # Regenerate Prisma client
npm run db:push       # Push schema changes to database
npm run db:seed       # Seed default categories and settings
npm run db:setup      # Push + seed (run once on fresh install)
```

## Configuration

All settings are managed in the **Settings** page:

- **Company Info** — Name, email, address (used in reports)
- **General** — Default currency
- **IMAP Email** — Configure a dedicated inbox for automatic invoice import
- **Google Drive** — OAuth2 credentials for automatic file uploads
- **Categories** — Customizable expense categories

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/invoices` | GET/POST | List/create invoices |
| `/api/invoices/[id]` | GET/PATCH/DELETE | Invoice CRUD |
| `/api/invoices/bulk` | PATCH | Bulk actions |
| `/api/projects` | GET/POST | List/create projects |
| `/api/projects/[id]` | GET/PATCH/DELETE | Project CRUD |
| `/api/receipts` | GET/POST | Upload/list receipts |
| `/api/receipts/[id]` | PATCH/DELETE | Receipt management |
| `/api/bank-statements` | GET/POST | Upload bank statements |
| `/api/bank-transactions` | GET | List transactions |
| `/api/reconciliation` | GET/POST/DELETE | Match invoices to transactions |
| `/api/dashboard` | GET | Dashboard analytics |
| `/api/reports` | GET | Export Excel reports (invoices, cashflow, tax, reconciliation, project) |
| `/api/categories` | GET/POST | Category management |
| `/api/vendors` | GET | Vendor list |
| `/api/settings` | GET/POST | App settings |
| `/api/email` | GET/POST | Email listener control |
| `/api/gdrive` | GET/POST | Google Drive operations |
| `/api/ai-extract` | POST | Manual AI extraction |

## Report Types

All reports export as Excel (.xlsx):

- `invoices` — All invoices with filters (project, date range, status)
- `cashflow` — Monthly invoiced vs paid breakdown
- `tax` — Expense breakdown by category for accountants
- `reconciliation` — Matched and unmatched transactions vs invoices
- `project` — Per-project budget summary and invoice list
