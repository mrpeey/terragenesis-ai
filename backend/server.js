const path = require('path');
const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'terra_user',
    password: process.env.DB_PASSWORD || 'securepass123',
    database: process.env.DB_NAME || 'terragenesis_ai',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Health
app.get('/health', (req, res) => res.json({status: 'ok'}));

// AI Plan Generation Endpoint (stub)
const { spawn } = require('child_process');

app.post('/generate-plan', async (req, res) => {
    try {
        const { coordinates } = req.body || {};

        // Call the Python AI stub as a subprocess
        const args = [];
        if (coordinates && coordinates.lat) args.push('--lat', String(coordinates.lat));
        if (coordinates && coordinates.lng) args.push('--lng', String(coordinates.lng));

        const py = spawn('python', ['ai/ai_stub.py', ...args]);
        let out = '';
        let err = '';
        py.stdout.on('data', (data) => out += data.toString());
        py.stderr.on('data', (data) => err += data.toString());

        py.on('close', async (code) => {
            if (code !== 0) {
                console.error('AI stub error:', err);
                return res.status(500).json({ error: 'ai_error', details: err });
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
                    [1, 'pending', plan['soil_strategy'], plan['vegetation_strategy'], plan['water_strategy'], 12]
                );
            } catch (dberr) {
                console.error('DB insert error:', dberr);
                // continue to return plan even if DB save fails
            }

            res.json(plan);
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
        console.error(err);
        res.status(500).json({error: 'internal_error'});
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
