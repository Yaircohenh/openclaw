/**
 * Invoice Manager Bridge Skill
 *
 * Read-only HTTP bridge to the invoice-manager service.
 * Queries the service's REST API and returns structured data.
 */

const BASE_URL = process.env.INVOICE_MANAGER_URL || 'http://localhost:3001';

const ALLOWED_ENDPOINTS = [
  '/api/invoices',
  '/api/dashboard',
  '/api/reports',
  '/api/vendors',
  '/api/categories',
  '/api/projects',
];

interface BridgeInput {
  endpoint: string;
  params?: Record<string, string>;
}

async function main() {
  const inputRaw = process.argv[2];
  if (!inputRaw) {
    console.error(JSON.stringify({ error: 'No input provided. Usage: bridge.ts \'{"endpoint":"/api/invoices"}\''}));
    process.exit(1);
  }

  let input: BridgeInput;
  try {
    input = JSON.parse(inputRaw);
  } catch {
    console.error(JSON.stringify({ error: 'Invalid JSON input' }));
    process.exit(1);
  }

  if (!ALLOWED_ENDPOINTS.some(ep => input.endpoint.startsWith(ep))) {
    console.error(JSON.stringify({
      error: `Endpoint not allowed: ${input.endpoint}`,
      allowed: ALLOWED_ENDPOINTS
    }));
    process.exit(1);
  }

  const url = new URL(input.endpoint, BASE_URL);
  if (input.params) {
    for (const [key, value] of Object.entries(input.params)) {
      url.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(JSON.stringify({
        error: `HTTP ${response.status}: ${response.statusText}`,
        url: url.toString(),
      }));
      process.exit(1);
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error(JSON.stringify({
      error: `Failed to reach invoice-manager: ${err.message}`,
      url: url.toString(),
      hint: 'Is the invoice-manager service running on port 3001?',
    }));
    process.exit(1);
  }
}

main();
