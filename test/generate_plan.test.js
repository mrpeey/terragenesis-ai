const request = require('supertest');
const expect = require('chai').expect;
const mysql = require('mysql2/promise');
const sinon = require('sinon');
const child_process = require('child_process');
const { getMaxPlanId, cleanupPlansAfter } = require('./helpers/db_cleanup');

describe('POST /generate-plan integration (stubbed AI)', function() {
  let spawnStub;

  beforeEach(async function() {
    // record current max id so we can cleanup later
    this._startMaxId = await getMaxPlanId();

    // stub child_process.spawn before requiring the app
    spawnStub = sinon.stub(child_process, 'spawn').callsFake(() => {
      const { PassThrough } = require('stream');
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      // push a fake JSON plan and close
      process.nextTick(() => {
        stdout.emit('data', JSON.stringify({
          soil_strategy: 'Stubbed soil strategy',
          vegetation_strategy: 'Stubbed vegetation',
          water_strategy: 'Stubbed water',
          timeline: 'stub'
        }));
        stdout.end();
        stderr.end();
        // simulate close with code 0
        proc.emit('close', 0);
      });

      const proc = new (require('events'))();
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = () => {};
      return proc;
    });
  });

  afterEach(async function() {
    // restore stub
    if (spawnStub && spawnStub.restore) spawnStub.restore();
    // cleanup any plans inserted during the test
    await cleanupPlansAfter(this._startMaxId);
  });

  it('returns a plan and a DB row is inserted', async function() {
    this.timeout(10000);

    // require app after stub installed to ensure our stub is used
    const app = require('../backend/server');

    // Call the endpoint in-process
    const payload = { coordinates: { lat: -1.2921, lng: 36.8219 } };
    const res = await request(app)
      .post('/generate-plan')
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('object');
    expect(res.body.soil_strategy).to.equal('Stubbed soil strategy');

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
       WHERE id > ?
       ORDER BY id DESC LIMIT 1`,
      [this._startMaxId]
    );

    await db.end();

    expect(rows).to.be.an('array').that.is.not.empty;
    const row = rows[0];
    expect(row.soil_strategy).to.equal('Stubbed soil strategy');
  });
});
