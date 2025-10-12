# terragenesis-ai.

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
