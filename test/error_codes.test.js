const request = require('supertest');
const expect = require('chai').expect;
const sinon = require('sinon');
const child_process = require('child_process');

// Import helper to inject DB used by routes
const { setDbForTesting } = require('../backend/server');

describe('Error code behaviors', function() {
  let spawnStub;

  afterEach(function() {
    if (spawnStub && spawnStub.restore) spawnStub.restore();
    // Reset injected DB
    setDbForTesting(undefined);
  });

  it('GET /health returns 503 when DB unreachable', async function() {
    // Inject a DB whose query rejects
    const badDb = {
      promise() {
        return {
          query: async () => { throw new Error('DB down'); },
          execute: async () => { throw new Error('DB down'); }
        };
      }
    };
    setDbForTesting(badDb);

    const app = require('../backend/server');

    const res = await request(app)
      .get('/health')
      .set('Accept', 'application/json');

    expect(res.status).to.equal(503);
    expect(res.body).to.deep.equal({ status: 'error', db: 'unreachable' });
  });

  it('GET /land-status returns 503 when DB error occurs', async function() {
    const badDb = {
      promise() {
        return {
          query: async () => { throw new Error('DB error'); },
          execute: async () => { throw new Error('DB error'); }
        };
      }
    };
    setDbForTesting(badDb);

    const app = require('../backend/server');

    const res = await request(app)
      .get('/land-status')
      .set('Accept', 'application/json');

    expect(res.status).to.equal(503);
    expect(res.body).to.deep.equal({ error: 'internal_error' });
  });

  it('POST /generate-plan returns 502 when AI process exits non-zero', async function() {
    spawnStub = sinon.stub(child_process, 'spawn').callsFake(() => {
      const { PassThrough } = require('stream');
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      // No output; simulate non-zero exit
      process.nextTick(() => {
        stdout.end();
        stderr.write('ai failed');
        stderr.end();
        proc.emit('close', 1, null);
      });
      const proc = new (require('events'))();
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = () => {};
      return proc;
    });

    const app = require('../backend/server');

    const res = await request(app)
      .post('/generate-plan')
      .send({})
      .set('Accept', 'application/json');

    expect(res.status).to.equal(502);
    expect(res.body.error).to.equal('ai_error');
  });

  it('POST /generate-plan returns 502 when AI outputs malformed JSON', async function() {
    spawnStub = sinon.stub(child_process, 'spawn').callsFake(() => {
      const { PassThrough } = require('stream');
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      process.nextTick(() => {
        stdout.write('not-json');
        stdout.end();
        stderr.end();
        proc.emit('close', 0, null);
      });
      const proc = new (require('events'))();
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = () => {};
      return proc;
    });

    const app = require('../backend/server');

    const res = await request(app)
      .post('/generate-plan')
      .send({})
      .set('Accept', 'application/json');

    expect(res.status).to.equal(502);
    expect(res.body.error).to.equal('ai_malformed');
  });

  it('POST /generate-plan returns 504 on AI timeout (SIGKILL signal)', async function() {
    spawnStub = sinon.stub(child_process, 'spawn').callsFake(() => {
      const { PassThrough } = require('stream');
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      // Simulate close with SIGKILL quickly
      process.nextTick(() => {
        stdout.end();
        stderr.end();
        proc.emit('close', null, 'SIGKILL');
      });
      const proc = new (require('events'))();
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = () => {};
      return proc;
    });

    const app = require('../backend/server');

    const res = await request(app)
      .post('/generate-plan')
      .send({})
      .set('Accept', 'application/json');

    expect(res.status).to.equal(504);
    expect(res.body.error).to.equal('ai_timeout');
  });
});
