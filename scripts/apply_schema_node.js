const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

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
      // Quick ping to ensure server is ready
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
  // Should never reach here
  throw new Error('Unexpected retry loop exit');
}

async function main() {
  const rootPwd = process.env.MYSQL_ROOT_PASSWORD;
  if (!rootPwd) {
    console.error(
      'Please set MYSQL_ROOT_PASSWORD environment variable before running this script.'
    );
    console.error(
      'Example (PowerShell): $env:MYSQL_ROOT_PASSWORD = "<root-pwd>"; node scripts/apply_schema_node.js'
    );
    process.exit(2);
  }

  const schemaPath = path.resolve(__dirname, '..', 'sql', 'land_management.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('Schema file not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    const conn = await connectWithRetry({
      host: process.env.DB_HOST || 'localhost',
      user: 'root', // Always use root for schema application
      password: rootPwd,
      multipleStatements: true
    });

    console.log('Applying SQL schema from', schemaPath);
    try {
      await conn.query(sql);
    } catch (applyErr) {
      // If schema execution fails, exit without retrying to avoid partial re-application hazards
      console.error('Error applying schema:', applyErr.message);
      await conn.end();
      process.exit(1);
    }

    console.log('Schema applied successfully. Verifying tables...');
    const [rows] = await conn.query("SHOW DATABASES LIKE 'terragenesis_ai';");
    if (rows.length === 0) {
      console.warn('Warning: database terragenesis_ai not found after applying schema.');
    }
    await conn.changeUser({ database: 'terragenesis_ai' });
    const [tables] = await conn.query('SHOW TABLES;');
    if (!tables || tables.length === 0) {
      console.log('(no tables)');
    } else {
      console.log('Tables in terragenesis_ai:');
      for (const t of tables) console.log(Object.values(t)[0]);
    }

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Error applying schema:', err.message);
    process.exit(1);
  }
}

main();
