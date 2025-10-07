/**
 * PostgreSQL Database Connection Pool
 * 
 * Connects to ORION-CORE PostgreSQL database on ORION-MEM (192.168.50.79)
 * Database: orion_core
 * Tables: chat_sessions, chat_messages
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '192.168.50.79',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'orion_core',
  user: process.env.DB_USER || 'orion',
  password: process.env.DB_PASSWORD || 'changeme',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  // Don't exit process - log and continue
  // process.exit(-1);
});

pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

module.exports = pool;
