const request = require('supertest');
const expect = require('chai').expect;
const { beginTransaction, rollbackTransaction } = require('./helpers/db_cleanup');
const { setDbForTesting } = require('../backend/server');

describe('Success path endpoints', function() {
  beforeEach(async function() {
    this._txnConn = await beginTransaction();
    const testDb = {
      promise() {
        return {
          execute: (...args) => this._txnConn.execute(...args),
          query: (...args) => this._txnConn.query(...args)
        };
      }
    };
    testDb.promise = testDb.promise.bind(this);
    setDbForTesting(testDb);
  });

  afterEach(async function() {
    if (this._txnConn) await rollbackTransaction(this._txnConn);
    setDbForTesting(undefined);
  });

  it('GET /health returns ok when DB connected', async function() {
    const app = require('../backend/server');
    const res = await request(app).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ status: 'ok', db: 'connected' });
  });

  it('GET /land-status returns object with defaults', async function() {
    const app = require('../backend/server');
    const res = await request(app).get('/land-status');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['degradation_level', 'soil_index', 'action_count']);
  });

  it('GET /unknown returns 404 with JSON body', async function() {
    const app = require('../backend/server');
    const res = await request(app).get('/does-not-exist');
    expect(res.status).to.equal(404);
    expect(res.body).to.have.property('error', 'not_found');
    expect(res.body).to.have.property('path');
  });
});
