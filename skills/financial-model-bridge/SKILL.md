# Financial Model Bridge

HTTP bridge skill that provides access to the ninja-redev real estate financial model service API.

## Usage
Used by the Finance agent to run AI-powered deal analyses on real estate properties.

## Endpoints
- `POST /api/analyze` — Send deal data to Claude for AI-powered investment analysis

## Configuration
- Service URL: `http://localhost:3000` (default)
- Override with env var: `NINJA_REDEV_URL`
- Requires `ANTHROPIC_API_KEY` to be set (used by the service internally)

## Permissions
- Network: localhost:3000 only
