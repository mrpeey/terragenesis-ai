# Changelog

## [0.1.0] - 2025-10-19

### Added
- **Error code standardization**: Implemented proper HTTP status codes across all endpoints
  - 503 Service Unavailable for DB connection failures
  - 502 Bad Gateway for upstream AI service failures
  - 504 Gateway Timeout for AI subprocess timeouts
  - 404 Not Found for unknown routes with JSON response
  - 500 Internal Server Error for unexpected errors
  
- **Centralized constants**: Created `backend/httpErrors.js` for HTTP status codes and error identifiers

- **Comprehensive test suite**:
  - Error-path tests for all failure scenarios (`test/error_codes.test.js`)
  - Success-path tests for healthy responses (`test/success_paths.test.js`)
  - 404 handler validation
  - All tests passing (9/9)

- **Code quality tooling**:
  - ESLint v9 with flat config (`eslint.config.cjs`)
  - Prettier configuration (`.prettierrc.json`)
  - Lint scripts: `npm run lint`, `npm run lint:fix`, `npm run format`
  - All code passes linting with no errors

- **CI/CD pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`)
  - Automated linting before tests
  - MySQL 8 service setup
  - Database schema application
  - Test execution on push/PR

- **Documentation**: Enhanced `README.md` with:
  - Backend API endpoints and error codes
  - CI/CD section
  - Testing instructions

### Changed
- Updated `backend/server.js`:
  - Use centralized HTTP status constants
  - Added JSON 404 handler
  - Fixed lint issues (unused variables, empty catch blocks)
  
- Updated `test/generate_plan.test.js`:
  - Removed unused mysql import

- Updated `public/index.html`:
  - Fixed image path reference

### Technical Details
- Node.js: 20
- ESLint: 9.38.0
- Prettier: 3.6.2
- Test framework: Mocha + Chai + Sinon + Supertest
- Database: MySQL 8

### Quality Metrics
- Tests: 9/9 passing
- Lint: 0 errors, 0 warnings
- Code coverage: Error paths and success paths covered
