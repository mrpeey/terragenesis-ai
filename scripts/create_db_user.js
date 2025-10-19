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

(async () => {
  try {
    const rootConn = await connectWithRetry({
      host: process.env.DB_HOST || 'localhost',
      user: 'root'
    });
    await rootConn.query('CREATE DATABASE IF NOT EXISTS terragenesis_ai;');
    await rootConn.query(
      "CREATE USER IF NOT EXISTS 'terra_user'@'localhost' IDENTIFIED BY 'securepass123';"
    );
    await rootConn.query(
      "CREATE USER IF NOT EXISTS 'terra_user'@'%' IDENTIFIED BY 'securepass123';"
    );
    await rootConn.query("GRANT ALL PRIVILEGES ON terragenesis_ai.* TO 'terra_user'@'localhost';");
    await rootConn.query("GRANT ALL PRIVILEGES ON terragenesis_ai.* TO 'terra_user'@'%';");
    await rootConn.query('FLUSH PRIVILEGES;');
    console.log('DB user terra_user created and privileges granted.');
    await rootConn.end();
  } catch (err) {
    console.error('Error creating DB user:', err.message);
    process.exit(1);
  }
})();
