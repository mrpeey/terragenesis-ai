const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'terra_user',
  password: process.env.DB_PASSWORD || 'securepass123',
  database: process.env.DB_NAME || 'terragenesis_ai'
};

async function getMaxPlanId() {
  const conn = await mysql.createConnection(config);
  try {
    const [rows] = await conn.execute('SELECT MAX(id) as maxId FROM regeneration_plans');
    return (rows && rows[0] && rows[0].maxId) ? rows[0].maxId : 0;
  } finally {
    await conn.end();
  }
}

async function cleanupPlansAfter(maxId) {
  const conn = await mysql.createConnection(config);
  try {
    await conn.execute('DELETE FROM regeneration_plans WHERE id > ?', [maxId]);
  } finally {
    await conn.end();
  }
}

module.exports = { getMaxPlanId, cleanupPlansAfter };
