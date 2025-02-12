import { Pool } from 'pg';

export async function initDb() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS log (
      id SERIAL PRIMARY KEY,
      inserted_at timestamptz NOT NULL DEFAULT now(),
      json json NOT NULL
    )
  `;

  await pool.query(createTableQuery);
  await pool.end();
}
