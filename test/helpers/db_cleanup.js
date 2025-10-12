const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'terra_user',
  password: process.env.DB_PASSWORD || 'securepass123',
  database: process.env.DB_NAME || 'terragenesis_ai'
};

async function beginTransaction() {
  const conn = await mysql.createConnection(config);
  await conn.beginTransaction();
  return conn;
}

async function rollbackTransaction(conn) {
  try {
    await conn.rollback();
  } finally {
    await conn.end();
  }
}

module.exports = { beginTransaction, rollbackTransaction };
