git add .
git commit -m "fix: ensure apply_schema_node.js uses root user, add DB setup docs"
git pushconst fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const rootPwd = process.env.MYSQL_ROOT_PASSWORD;
  if (!rootPwd) {
    console.error('Please set MYSQL_ROOT_PASSWORD environment variable before running this script.');
    console.error('Example (PowerShell): $env:MYSQL_ROOT_PASSWORD = "<root-pwd>"; node scripts/apply_schema_node.js');
    process.exit(2);
  }

  const schemaPath = path.resolve(__dirname, '..', 'sql', 'land_management.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('Schema file not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: 'root', // Always use root for schema application
      password: rootPwd,
      multipleStatements: true
    });

    console.log('Applying SQL schema from', schemaPath);
    await conn.query(sql);
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
