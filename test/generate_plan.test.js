const request = require('supertest');
const expect = require('chai').expect;
const mysql = require('mysql2/promise');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

describe('POST /generate-plan integration', function() {
  it('returns a plan and a DB row is inserted', async function() {
    this.timeout(10000);

    // Call the endpoint
    const payload = { coordinates: { lat: -1.2921, lng: 36.8219 } };
    const res = await request(APP_URL)
      .post('/generate-plan')
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.property('soil_strategy');
    expect(res.body).to.have.property('vegetation_strategy');
    expect(res.body).to.have.property('water_strategy');

    // Query DB for the most recent regeneration_plans row
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'terra_user',
      password: process.env.DB_PASSWORD || 'securepass123',
      database: process.env.DB_NAME || 'terragenesis_ai'
    });

    const [rows] = await db.execute(
      `SELECT id, soil_strategy, vegetation_strategy, water_strategy
       FROM regeneration_plans
       ORDER BY id DESC LIMIT 1`
    );

    await db.end();

    expect(rows).to.be.an('array').that.is.not.empty;
    const row = rows[0];

    // Basic equality: the soil_strategy returned by API should match DB row substring
    expect(row.soil_strategy).to.include(res.body.soil_strategy.split(' ')[0]);
  });
});
