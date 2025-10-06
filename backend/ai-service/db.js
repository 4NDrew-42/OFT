const { Pool } = require('pg');

const pool = new Pool({
  host: '192.168.50.79',
  port: 5432,
  database: 'orion_core',
  user: 'orion',
  password: 'changeme',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
