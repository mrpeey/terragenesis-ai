# Changelog

## [Unreleased] - 2025-10-19

### Added - Advanced Validation & Development Tools

#### Extended Schema Validation

- **Unique Constraints Validation**: Checks UNIQUE constraints on columns (e.g., `users.email`)
- **Index Validation**: Validates non-unique indexes on foreign key columns
- **Updated**: `scripts/expected_schema.json` now includes `uniqueConstraints` and `indexes` arrays
- **Enhanced**: `scripts/check_tables.js` queries `INFORMATION_SCHEMA.COLUMNS` and `INFORMATION_SCHEMA.STATISTICS` for comprehensive validation

#### Pre-commit Hooks

- **Installed**: Husky v9 + lint-staged
- **Configured**: `.husky/pre-commit` runs `lint-staged` automatically
- **Lint-staged Rules**:
  - `*.js`: ESLint auto-fix + Prettier formatting
  - `*.{json,md}`: Prettier formatting
- **Benefits**: Ensures all committed code is linted and formatted consistently

#### Test Coverage Reporting

- **Installed**: c8 (V8 native coverage)
- **New Script**: `npm run test:coverage`
- **Reporters**: text (console), html (coverage/ folder), lcov (for CI integrations)
- **Configuration**: Excludes test/, scripts/, node_modules/, .husky/, ai/ from coverage
- **Current Coverage**: ~83% statements, ~72% branches on backend code
- **Updated**: `.gitignore` to exclude coverage artifacts

### Changed

- **package.json**: Added `test:coverage`, `lint-staged`, and `c8` configurations
- **Documentation**: Updated README and DATABASE_SETUP.md to reflect new validation features and pre-commit hooks

---

### Added - Database Reliability & Schema Validation

#### Connection Retry/Backoff for All DB Scripts

- **Scripts Enhanced**: `apply_schema_node.js`, `create_db_user_root.js`, `create_db_user.js`, `check_tables.js`
- **Features**:
  - Exponential backoff retry logic for MySQL connections
  - Configurable via environment variables:
    - `SCHEMA_MAX_RETRIES` (default: 10, CI: 15)
    - `SCHEMA_RETRY_DELAY_MS` (default: 1000)
    - `SCHEMA_BACKOFF_FACTOR` (default: 1.5)
  - Handles slow MySQL startup in CI and Docker environments
  - Clear console feedback on retry attempts and connection status

#### Comprehensive Schema Validation System

- **New File**: `scripts/expected_schema.json`
  - Defines expected tables, columns, primary keys, and foreign keys
  - Source of truth for schema validation
  - Includes all 4 core tables: users, land_parcels, ai_analysis, regeneration_plans
- **Enhanced**: `scripts/check_tables.js`
  - **Table Validation**: Checks minimum table count (`MIN_TABLES`) and specific table names (`EXPECT_TABLES`)
  - **Column Validation**: Verifies all expected columns exist using `INFORMATION_SCHEMA.COLUMNS`
  - **Primary Key Validation**: Confirms primary keys are defined on correct columns
  - **Foreign Key Validation**: Validates foreign key relationships match expected schema
  - **Exit Codes**:
    - 0: Success
    - 1: DB connection error
    - 2: Insufficient tables
    - 3: Missing required table(s)
    - 4: Schema file not found
    - 5: Column/key validation failure
  - **Environment Variables**:
    - `VALIDATE_SCHEMA`: Enable structure validation (1/true)
    - `EXPECT_SCHEMA_FILE`: Custom schema file path (default: `scripts/expected_schema.json`)
    - `MIN_TABLES`: Minimum required table count
    - `EXPECT_TABLES`: Comma-separated list of required table names

#### CI/CD Enhancements

- **Updated**: `.github/workflows/ci.yml`
  - Added schema verification step after applying SQL
  - Validates table existence, columns, primary keys, and foreign keys
  - Centralized retry/backoff environment variables at job level
  - Fails fast if schema drift detected
  - Fixed duplicate test command lines

#### Database Setup Documentation

- **New**: `docs/DATABASE_SETUP.md`
  - Docker and local MySQL setup instructions
  - Retry/backoff configuration examples
  - Schema validation usage guide
  - Troubleshooting section for common issues
  - Environment variable reference

### Changed

- **DB User Creation Scripts**: Now grant privileges for both `localhost` and `%` hosts to support containerized CI environments
- **Schema Application**: `apply_schema_node.js` always connects as root with retry logic; validates tables after applying
- **CI Workflow**: Added VALIDATE_SCHEMA=1 to enforce structure validation automatically

### Fixed

- CI "Access denied for user 'terra_user@172.18.0.1'" errors by adding wildcard host grants
- Schema application reliability in slow-starting MySQL environments
- Potential race conditions during DB initialization in CI

---

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
