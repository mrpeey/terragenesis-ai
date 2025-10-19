const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(config) {
  const maxRetries = Number.parseInt(process.env.SCHEMA_MAX_RETRIES || '10', 10);
  const baseDelay = Number.parseInt(process.env.SCHEMA_RETRY_DELAY_MS || '1000', 10);
  const backoff = Number.parseFloat(process.env.SCHEMA_BACKOFF_FACTOR || '1.5');

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt += 1;
    try {
      const conn = await mysql.createConnection(config);
      await conn.query('SELECT 1');
      if (attempt > 1) {
        console.log(`Connected to MySQL after ${attempt} attempts.`);
      } else {
        console.log('Connected to MySQL.');
      }
      return conn;
    } catch (err) {
      const delay = Math.round(baseDelay * Math.pow(backoff, attempt - 1));
      console.error(`MySQL connection attempt ${attempt} failed: ${err.message}`);
      if (attempt >= maxRetries) {
        throw new Error(`Unable to connect to MySQL after ${maxRetries} attempts.`);
      }
      console.log(`Retrying in ${delay} ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Unexpected retry loop exit');
}

async function main() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'terra_user',
    password: process.env.DB_PASSWORD || 'securepass123',
    database: process.env.DB_NAME || 'terragenesis_ai'
  };
  const minTables = Number.parseInt(
    process.env.MIN_TABLES || process.env.REQUIRE_TABLES || '0',
    10
  );
  const expectTables = (process.env.EXPECT_TABLES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const schemaFilePath =
    process.env.EXPECT_SCHEMA_FILE || path.join(__dirname, 'expected_schema.json');
  const validateSchema =
    process.env.VALIDATE_SCHEMA === '1' || process.env.VALIDATE_SCHEMA === 'true';

  console.log('Using DB config:', config);
  console.log('Minimum tables required:', minTables);
  if (validateSchema) {
    console.log('Schema validation enabled:', schemaFilePath);
  }
  try {
    const conn = await connectWithRetry(config);
    const [rows] = await conn.query('SHOW TABLES;');
    console.log('Tables in', config.database, ':');
    if (!rows || rows.length === 0) {
      console.log('(no tables)');
    } else {
      for (const r of rows) console.log(Object.values(r)[0]);
    }

    if ((rows?.length || 0) < minTables) {
      console.error(
        `Schema verification failed: expected at least ${minTables} table(s), found ${rows?.length || 0}.`
      );
      await conn.end();
      process.exit(2);
    }

    if (expectTables.length) {
      const present = new Set(rows.map((r) => String(Object.values(r)[0])));
      const missing = expectTables.filter((t) => !present.has(t));
      if (missing.length) {
        console.error(
          `Schema verification failed: missing required table(s): ${missing.join(', ')}`
        );
        await conn.end();
        process.exit(3);
      }
    }

    // Validate column structure if requested
    if (validateSchema) {
      if (!fs.existsSync(schemaFilePath)) {
        console.error(`Schema file not found: ${schemaFilePath}`);
        await conn.end();
        process.exit(4);
      }
      const expectedSchema = JSON.parse(fs.readFileSync(schemaFilePath, 'utf8'));
      const errors = [];

      for (const [tableName, tableSpec] of Object.entries(expectedSchema.tables || {})) {
        const [cols] = await conn.query(
          'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
          [config.database, tableName]
        );
        const actualCols = cols.map((r) => r.COLUMN_NAME);
        const expectedCols = tableSpec.columns || [];
        const missingCols = expectedCols.filter((c) => !actualCols.includes(c));
        if (missingCols.length) {
          errors.push(`Table '${tableName}' missing column(s): ${missingCols.join(', ')}`);
        }

        // Validate primary key
        if (tableSpec.primaryKey) {
          const [pkRows] = await conn.query(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_KEY = "PRI"',
            [config.database, tableName]
          );
          const actualPKs = pkRows.map((r) => r.COLUMN_NAME);
          if (!actualPKs.includes(tableSpec.primaryKey)) {
            errors.push(
              `Table '${tableName}' missing primary key on column '${tableSpec.primaryKey}'`
            );
          }
        }

        // Validate foreign keys
        if (tableSpec.foreignKeys && tableSpec.foreignKeys.length) {
          const [fkRows] = await conn.query(
            `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
            [config.database, tableName]
          );
          const actualFKs = fkRows.map((r) => ({
            column: r.COLUMN_NAME,
            referencedTable: r.REFERENCED_TABLE_NAME,
            referencedColumn: r.REFERENCED_COLUMN_NAME
          }));

          for (const expectedFK of tableSpec.foreignKeys) {
            const found = actualFKs.find(
              (fk) =>
                fk.column === expectedFK.column &&
                fk.referencedTable === expectedFK.referencedTable &&
                fk.referencedColumn === expectedFK.referencedColumn
            );
            if (!found) {
              errors.push(
                `Table '${tableName}' missing foreign key: ${expectedFK.column} -> ${expectedFK.referencedTable}(${expectedFK.referencedColumn})`
              );
            }
          }
        }

        // Validate unique constraints
        if (tableSpec.uniqueConstraints && tableSpec.uniqueConstraints.length) {
          const [uniqueRows] = await conn.query(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_KEY = "UNI"',
            [config.database, tableName]
          );
          const actualUnique = uniqueRows.map((r) => r.COLUMN_NAME);

          for (const uniqueCol of tableSpec.uniqueConstraints) {
            if (!actualUnique.includes(uniqueCol)) {
              errors.push(
                `Table '${tableName}' missing unique constraint on column '${uniqueCol}'`
              );
            }
          }
        }

        // Validate indexes (non-unique, non-primary)
        if (tableSpec.indexes && tableSpec.indexes.length) {
          const [indexRows] = await conn.query(
            'SELECT DISTINCT COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND NON_UNIQUE = 1',
            [config.database, tableName]
          );
          const actualIndexes = indexRows.map((r) => r.COLUMN_NAME);

          for (const indexCol of tableSpec.indexes) {
            if (!actualIndexes.includes(indexCol)) {
              errors.push(`Table '${tableName}' missing index on column '${indexCol}'`);
            }
          }
        }
      }

      if (errors.length) {
        console.error('Schema validation failed:');
        for (const err of errors) console.error(`  - ${err}`);
        await conn.end();
        process.exit(5);
      }
      console.log('Schema structure validated successfully.');
    }

    await conn.end();
  } catch (err) {
    console.error('DB error:', err.message);
    process.exit(1);
  }
}

main();
