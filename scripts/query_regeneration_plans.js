const mysql = require('mysql2/promise');

async function main() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'terra_user',
    password: process.env.DB_PASSWORD || 'securepass123',
    database: process.env.DB_NAME || 'terragenesis_ai',
    multipleStatements: false,
  };

  console.log('Using DB config:', {
    host: config.host,
    user: config.user,
    database: config.database,
  });

  const conn = await mysql.createConnection(config);
  try {
    const [rows] = await conn.execute(
      `SELECT id, parcel_id, creation_date, implementation_status, soil_strategy, vegetation_strategy, water_strategy, timeline_months
       FROM regeneration_plans
       ORDER BY id DESC
       LIMIT 10`
    );

    if (!rows || rows.length === 0) {
      console.log('No rows found in regeneration_plans.');
      return;
    }

    // Print formatted JSON for easy reading
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Query failed:', err && err.message ? err.message : err);
  process.exit(1);
});
