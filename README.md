

# terragenesis-ai.

TerraGenesis AI is an integrated AI-powered platform designed to combat land degradation and promote regenerative practices. Leveraging advanced machine learning, remote sensing, and data analytics, TerraGenesis AI provides actionable insights for improved soil health, optimized agricultural practices, effective reforestation strategies, and enhanced climate resilience. Our solution empowers landowners, farmers, governments, and NGOs with the tools they need to restore degraded landscapes, improve productivity, and build a more sustainable future

## Quick Start

1. **Setup database** (see [Database Setup Guide](docs/DATABASE_SETUP.md))
2. **Install dependencies**: `npm install`
3. **Run tests**: `npm test`
4. **Start server**: `npm start` or `npm run dev`

## Testing

This project exports the Express `app` from `backend/server.js`, which makes it easy to run integration tests in-process using Supertest without starting the server as a separate process.

Quick examples:

- Run the test suite (uses Mocha):

```powershell
npm test
```

- Example test pattern (use in your test files):

```js
// test/example.test.js
const request = require('supertest');
const app = require('../backend/server');

describe('in-process tests', () => {
	it('hits /health', async () => {
		const res = await request(app).get('/health');
		// assert res.status etc.
	});
});
```

- Run the server with pretty logs during development:

```powershell
# use pino-pretty for human-friendly output
node -r pino-pretty backend/server.js
```

Notes:
- Integration tests in `test/` may use the database. For isolated CI, consider using a separate test database and cleaning up rows in before/after hooks.
- The server supports a `ALLOWED_ORIGINS` environment variable (comma-separated) to restrict CORS in non-development environments.

## Continuous Integration (CI)

This repo includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:
- Starts a MySQL 8 service
- Creates the `terra_user` and grants privileges
- Applies the schema from `sql/land_management.sql`
- Runs the test suite (`npm test`)

Environment variables used by CI:
- `DB_HOST=127.0.0.1`
- `DB_USER=terra_user`
- `DB_PASSWORD=securepass123`
- `DB_NAME=terragenesis_ai`
- `MYSQL_ROOT_PASSWORD=root` (for schema and user setup)

## Backend

Express server lives in `backend/server.js`.

### Endpoints

- `POST /generate-plan`
	- Calls a Python AI stub and returns a generated plan object
	- Body: `{ coordinates: { lat: number, lng: number } }` (optional)
	- Success: `200 OK` JSON plan
	- Errors:
		- `500 Internal Server Error` on unexpected backend error
		- `504 Gateway Timeout` if the AI subprocess times out
		- `502 Bad Gateway` if the AI subprocess fails (non-zero exit)
		- `502 Bad Gateway` if the AI response is malformed JSON

- `GET /health`
	- Performs a lightweight DB ping
	- Success: `200 OK` `{ status: 'ok', db: 'connected' }`
	- Errors: `503 Service Unavailable` `{ status: 'error', db: 'unreachable' }` if DB is not reachable

- `GET /land-status`
	- Reads a sample parcel and returns derived monitoring fields
	- Success: `200 OK` `{ degradation_level, soil_index, action_count }`
	- Errors: `503 Service Unavailable` `{ error: 'internal_error' }` when DB unavailable

- Any other path
	- Returns: `404 Not Found` `{ error: 'not_found', path: '<requested-url>' }`

### Error/status constants

Common HTTP status codes and error identifiers are centralized in `backend/httpErrors.js` and used by the server to keep responses consistent.
