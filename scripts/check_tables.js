const mysql = require('mysql2/promise');
async function main(){
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'terra_user',
    password: process.env.DB_PASSWORD || 'securepass123',
    database: process.env.DB_NAME || 'terragenesis_ai'
  };
  console.log('Using DB config:', config);
  try{
    const conn = await mysql.createConnection(config);
    const [rows] = await conn.query("SHOW TABLES;");
    console.log('Tables in', config.database, ':');
    if (!rows || rows.length === 0) {
      console.log('(no tables)');
    } else {
      for (const r of rows) console.log(Object.values(r)[0]);
    }
    await conn.end();
  } catch (err){
    console.error('DB error:', err.message);
    process.exit(1);
  }
}

main();
