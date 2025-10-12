const mysql = require('mysql2/promise');

async function main() {
  const rootPassword = process.env.MYSQL_ROOT_PASSWORD;
  if (!rootPassword) {
    console.error('Please set MYSQL_ROOT_PASSWORD in the environment before running this script.');
    console.error('Example (PowerShell): $env:MYSQL_ROOT_PASSWORD = "<root-pwd>"; node scripts/create_db_user_root.js');
    process.exit(2);
  }

  try {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: rootPassword });
    await conn.query("CREATE DATABASE IF NOT EXISTS terragenesis_ai;");
    await conn.query("CREATE USER IF NOT EXISTS 'terra_user'@'localhost' IDENTIFIED BY 'securepass123';");
    await conn.query("GRANT ALL PRIVILEGES ON terragenesis_ai.* TO 'terra_user'@'localhost';");
    await conn.query('FLUSH PRIVILEGES;');
    console.log('Success: DB user terra_user created (or already exists) and granted privileges on terragenesis_ai.');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Error creating DB user:', err.message);
    process.exit(1);
  }
}

main();
