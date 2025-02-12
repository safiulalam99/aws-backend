import express from 'express';
import { Pool } from 'pg';
import { initDb } from './db';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());


initDb()
  .then(() => console.log('Database initialized'))
  .catch((err) => console.error('Database initialization failed', err));

// GET 
app.get('/log', async (_req, res) => {
  try {
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const result = await pool.query('SELECT * FROM log ORDER BY inserted_at DESC');
    await pool.end();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST 
app.post('/log', async (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing JSON body' });
    }
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const insertQuery = `
      INSERT INTO log (json)
      VALUES ($1)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [data]);
    await pool.end();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to insert log' });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
