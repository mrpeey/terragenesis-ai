const path = require('path');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const pino = require('pino');
require('dotenv').config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS origin restriction (comma-separated list)
const allowed = (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5500,http://localhost:5500,http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
    origin: function(origin, cb) {
        // allow non-browser tools (no origin) or allowed origins
        if (!origin || allowed.indexOf(origin) !== -1) return cb(null, true);
        const msg = `Origin ${origin} not allowed by CORS`;
        logger.warn(msg);
        return cb(new Error(msg), false);
    }
}));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Database connection
let db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'terra_user',
    password: process.env.DB_PASSWORD || 'securepass123',
    database: process.env.DB_NAME || 'terragenesis_ai',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Allow tests to inject a connection/pool (transactional rollback)
function setDbForTesting(newDb) {
    db = newDb;
}

// Health - perform a lightweight DB ping
app.get('/health', async (req, res) => {
    try {
        await db.promise().query('SELECT 1');
        return res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        logger.error({ err }, 'DB health check failed');
        return res.status(500).json({ status: 'error', db: 'unreachable' });
    }
});

// AI Plan Generation Endpoint (stub)
const child_process = require('child_process');
const whichPython = () => {
    // Prefer python3, then python
    const candidates = ['python', 'python3'];
    for (const c of candidates) {
        try {
            const which = require('child_process').spawnSync(c, ['--version']);
            if (which.status === 0) return c;
        } catch (e) {
            // ignore
        }
    }
    return 'python';
};

app.post('/generate-plan', async (req, res) => {
    try {
        const { coordinates } = req.body || {};

        // Call the Python AI stub as a subprocess
        const args = [];
        if (coordinates && coordinates.lat) args.push('--lat', String(coordinates.lat));
        if (coordinates && coordinates.lng) args.push('--lng', String(coordinates.lng));

    const pythonExec = whichPython();
    logger.info({ pythonExec }, 'Spawning AI subprocess');
    const py = child_process.spawn(pythonExec, ['ai/ai_stub.py', ...args]);
        let out = '';
        let err = '';

        py.stdout.on('data', (data) => out += data.toString());
        py.stderr.on('data', (data) => err += data.toString());

        const killTimer = setTimeout(() => {
            try { py.kill('SIGKILL'); } catch (e) {}
            logger.warn('AI subprocess killed due to timeout');
        }, 20000);

        py.on('close', async (code, signal) => {
            clearTimeout(killTimer);
            if (signal === 'SIGKILL') {
                logger.error('AI stub timed out');
                return res.status(504).json({ error: 'ai_timeout' });
            }

            if (code !== 0) {
                logger.error({ code, err, out }, 'AI stub error');
                return res.status(500).json({ error: 'ai_error', details: err || out });
            }

            let parsed;
            try {
                parsed = JSON.parse(out);
            } catch (e) {
                console.error('Malformed JSON from AI stub', e, out);
                return res.status(500).json({ error: 'ai_malformed' });
            }

            const plan = parsed.plan || parsed;

            // Save to database (example uses parcel_id = 1)
            try {
                await db.promise().execute(
                    `INSERT INTO regeneration_plans 
                    (parcel_id, creation_date, implementation_status, soil_strategy, vegetation_strategy, water_strategy, timeline_months) 
                    VALUES (?, CURDATE(), ?, ?, ?, ?, ?)`,
                    [1, 'pending', plan['soil_strategy'], plan['vegetation_strategy'], plan['water_strategy'], plan['timeline_months'] || 12]
                );
            } catch (dberr) {
                logger.error({ err: dberr }, 'DB insert error');
                // continue to return plan even if DB save fails
            }

            return res.json(plan);
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'internal_error'});
    }
});

// Land Status Monitoring Endpoint (stub)
app.get('/land-status', async (req, res) => {
    try {
        // Example: read a parcel (id=1) and synthesize fields expected by frontend
        const [rows] = await db.promise().query(
            `SELECT id, degradation_level, NULL AS soil_index, 0 AS action_count FROM land_parcels WHERE id = ?`,
            [1]
        );

        if (!rows || rows.length === 0) {
            return res.json({degradation_level: 'unknown', soil_index: null, action_count: 0});
        }

        // Placeholder values; in real system derive soil_index/action_count from ai_analysis
        res.json({
            degradation_level: rows[0].degradation_level || 'moderate',
            soil_index: 68,
            action_count: 4
        });
    } catch (err) {
        logger.error({ err }, 'land-status error');
        res.status(500).json({error: 'internal_error'});
    }
});

// Central error handler
app.use((err, req, res, next) => {
    logger.error({ err }, 'Unhandled error');
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'internal_error' });
});

// Export app for tests (export app itself so Supertest can accept it)
// and attach helper to inject a test DB
module.exports = app;
module.exports.setDbForTesting = setDbForTesting;

if (require.main === module) {
    const server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });

    const shutdown = async () => {
        logger.info('Shutting down server...');
        try {
            await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
            if (db && db.end) await db.end();
        } catch (e) {
            logger.error({ e }, 'Error during shutdown');
        }
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
