# Invoice Manager Bridge

HTTP bridge skill that provides read-only access to the invoice-manager service API.

## Usage
Used by the Accounting agent to query invoices, vendors, categories, projects, and dashboard analytics.

## Endpoints
- `GET /api/invoices` — List/filter invoices (supports query params: status, vendor, category, dateFrom, dateTo)
- `GET /api/invoices/:id` — Get single invoice details
- `GET /api/dashboard` — Dashboard analytics (totals, charts, KPIs)
- `GET /api/reports` — Generate reports (type: invoices, cashflow, tax, reconciliation, project)
- `GET /api/vendors` — List vendors with spend totals
- `GET /api/categories` — List expense categories
- `GET /api/projects` — List projects with budget tracking

## Configuration
- Service URL: `http://localhost:3001` (default)
- Override with env var: `INVOICE_MANAGER_URL`

## Permissions
- Network: localhost:3001 only
- Mode: READ-ONLY — no POST/PUT/DELETE operations
- The invoice-manager app code is never modified
