const mysql = require('mysql2/promise');
(async () => {
  try {
    const rootConn = await mysql.createConnection({ host: 'localhost', user: 'root' });
    await rootConn.query("CREATE DATABASE IF NOT EXISTS terragenesis_ai;");
    await rootConn.query("CREATE USER IF NOT EXISTS 'terra_user'@'localhost' IDENTIFIED BY 'securepass123';");
    await rootConn.query("GRANT ALL PRIVILEGES ON terragenesis_ai.* TO 'terra_user'@'localhost';");
    await rootConn.query('FLUSH PRIVILEGES;');
    console.log('DB user terra_user created and privileges granted.');
    await rootConn.end();
  } catch (err) {
    console.error('Error creating DB user:', err.message);
    process.exit(1);
  }
})();
