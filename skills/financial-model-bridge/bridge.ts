/**
 * Financial Model Bridge Skill
 *
 * HTTP bridge to the ninja-redev financial model service.
 * Sends deal data to /api/analyze for AI-powered analysis.
 */

const BASE_URL = process.env.NINJA_REDEV_URL || 'http://localhost:3000';

interface BridgeInput {
  action: 'analyze';
  dealData?: Record<string, any>;
}

async function main() {
  const inputRaw = process.argv[2];
  if (!inputRaw) {
    console.error(JSON.stringify({ error: 'No input provided. Usage: bridge.ts \'{"action":"analyze","dealData":{...}}\''}));
    process.exit(1);
  }

  let input: BridgeInput;
  try {
    input = JSON.parse(inputRaw);
  } catch {
    console.error(JSON.stringify({ error: 'Invalid JSON input' }));
    process.exit(1);
  }

  if (input.action !== 'analyze') {
    console.error(JSON.stringify({ error: `Unknown action: ${input.action}. Supported: analyze` }));
    process.exit(1);
  }

  const url = `${BASE_URL}/api/analyze`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(input.dealData || {}),
    });

    if (!response.ok) {
      console.error(JSON.stringify({
        error: `HTTP ${response.status}: ${response.statusText}`,
        url,
      }));
      process.exit(1);
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error(JSON.stringify({
      error: `Failed to reach ninja-redev: ${err.message}`,
      url,
      hint: 'Is the ninja-redev service running on port 3000?',
    }));
    process.exit(1);
  }
}

main();
