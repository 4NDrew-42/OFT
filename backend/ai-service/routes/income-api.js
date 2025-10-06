const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '192.168.50.79',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orion_core',
  user: process.env.DB_USER || 'orion',
  password: process.env.DB_PASSWORD || 'changeme'
});

// Helper function to validate UUID
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to calculate next occurrence date
function calculateNextOccurrence(startDate, pattern) {
  const date = new Date(startDate);
  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return date.toISOString().split('T')[0];
}

// CREATE: Add new income
router.post('/', async (req, res) => {
  console.log("POST /api/income - Body:", JSON.stringify(req.body));
  const { user_email, amount, income_date, source, category, description, payment_method, is_recurring, recurrence_pattern, recurrence_start_date, recurrence_end_date, tags } = req.body;
  
  if (!user_email || !amount || !income_date) {
    return res.status(400).json({ error: 'Missing required fields: user_email, amount, income_date' });
  }
  
  // Validate recurring fields
  if (is_recurring && !recurrence_pattern) {
    return res.status(400).json({ error: 'recurrence_pattern required when is_recurring is true' });
  }
  
  try {
    // Calculate next occurrence if recurring
    let next_occurrence = null;
    if (is_recurring && recurrence_pattern) {
      const startDate = recurrence_start_date || income_date;
      next_occurrence = calculateNextOccurrence(startDate, recurrence_pattern);
    }
    
    const query = `
      INSERT INTO income (user_email, amount, income_date, source, category, description, payment_method, is_recurring, recurrence_pattern, recurrence_start_date, recurrence_end_date, next_occurrence_date, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [user_email, amount, income_date, source, category, description, payment_method, is_recurring || false, recurrence_pattern, recurrence_start_date, recurrence_end_date, next_occurrence, tags || []];
    
    const result = await pool.query(query, values);
    res.status(201).json({ success: true, income: result.rows[0] });
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ error: 'Failed to create income', details: error.message });
  }
});

// READ: Get user's income with filters
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  const { category, payment_method, start_date, end_date, is_recurring } = req.query;
  
  try {
    let query = 'SELECT * FROM income WHERE user_email = $1';
    const values = [email];
    let paramCount = 1;
    
    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(category);
    }
    
    if (payment_method) {
      paramCount++;
      query += ` AND payment_method = $${paramCount}`;
      values.push(payment_method);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND income_date >= $${paramCount}`;
      values.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND income_date <= $${paramCount}`;
      values.push(end_date);
    }
    
    if (is_recurring !== undefined) {
      paramCount++;
      query += ` AND is_recurring = $${paramCount}`;
      values.push(is_recurring === 'true');
    }
    
    query += ' ORDER BY income_date DESC';
    
    const result = await pool.query(query, values);
    
    // Calculate total
    const total = result.rows.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    
    res.json({ success: true, income: result.rows, count: result.rows.length, total: total.toFixed(2) });
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ error: 'Failed to fetch income', details: error.message });
  }
});

// READ: Get income summary by category
router.get('/summary/:email', async (req, res) => {
  const { email } = req.params;
  const { start_date, end_date } = req.query;
  
  try {
    let query = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as average
      FROM income
      WHERE user_email = $1
    `;
    const values = [email];
    let paramCount = 1;
    
    if (start_date) {
      paramCount++;
      query += ` AND income_date >= $${paramCount}`;
      values.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND income_date <= $${paramCount}`;
      values.push(end_date);
    }
    
    query += ' GROUP BY category ORDER BY total DESC';
    
    const result = await pool.query(query, values);
    res.json({ success: true, summary: result.rows });
  } catch (error) {
    console.error('Get income summary error:', error);
    res.status(500).json({ error: 'Failed to fetch income summary', details: error.message });
  }
});

// READ: Get single income by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid income ID format' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM income WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }
    
    res.json({ success: true, income: result.rows[0] });
  } catch (error) {
    console.error('Get income by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch income', details: error.message });
  }
});

// UPDATE: Update income
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, income_date, source, category, description, payment_method, is_recurring, recurrence_pattern, recurrence_start_date, recurrence_end_date, tags } = req.body;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid income ID format' });
  }
  
  try {
    // Calculate next occurrence if recurring
    let next_occurrence = null;
    if (is_recurring && recurrence_pattern) {
      const startDate = recurrence_start_date || income_date;
      next_occurrence = calculateNextOccurrence(startDate, recurrence_pattern);
    }
    
    const query = `
      UPDATE income
      SET amount = COALESCE($1, amount),
          income_date = COALESCE($2, income_date),
          source = COALESCE($3, source),
          category = COALESCE($4, category),
          description = COALESCE($5, description),
          payment_method = COALESCE($6, payment_method),
          is_recurring = COALESCE($7, is_recurring),
          recurrence_pattern = COALESCE($8, recurrence_pattern),
          recurrence_start_date = COALESCE($9, recurrence_start_date),
          recurrence_end_date = COALESCE($10, recurrence_end_date),
          next_occurrence_date = COALESCE($11, next_occurrence_date),
          tags = COALESCE($12, tags)
      WHERE id = $13
      RETURNING *
    `;
    const values = [amount, income_date, source, category, description, payment_method, is_recurring, recurrence_pattern, recurrence_start_date, recurrence_end_date, next_occurrence, tags, id];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }
    
    res.json({ success: true, income: result.rows[0] });
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ error: 'Failed to update income', details: error.message });
  }
});

// DELETE: Delete income
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid income ID format' });
  }
  
  try {
    const result = await pool.query('DELETE FROM income WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }
    
    res.json({ success: true, message: 'Income deleted successfully', income: result.rows[0] });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ error: 'Failed to delete income', details: error.message });
  }
});

// GET: Get recurring income that need to be created
router.get('/recurring/due', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const query = `
      SELECT * FROM income
      WHERE is_recurring = TRUE
      AND next_occurrence_date <= $1
      AND (recurrence_end_date IS NULL OR recurrence_end_date >= $1)
      ORDER BY next_occurrence_date ASC
    `;
    
    const result = await pool.query(query, [today]);
    res.json({ success: true, income: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get due recurring income error:', error);
    res.status(500).json({ error: 'Failed to fetch due recurring income', details: error.message });
  }
});

// POST: Create next occurrence of recurring income
router.post('/recurring/:id/create-next', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid income ID format' });
  }
  
  try {
    // Get the recurring income
    const parentResult = await pool.query('SELECT * FROM income WHERE id = $1 AND is_recurring = TRUE', [id]);
    
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring income not found' });
    }
    
    const parent = parentResult.rows[0];
    
    // Check if end date has passed
    if (parent.recurrence_end_date && new Date(parent.recurrence_end_date) < new Date()) {
      return res.status(400).json({ error: 'Recurring income has ended' });
    }
    
    // Create new income entry
    const newIncomeDate = parent.next_occurrence_date || new Date().toISOString().split('T')[0];
    const nextOccurrence = calculateNextOccurrence(newIncomeDate, parent.recurrence_pattern);
    
    const createQuery = `
      INSERT INTO income (user_email, amount, income_date, source, category, description, payment_method, parent_recurring_id, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const createValues = [parent.user_email, parent.amount, newIncomeDate, parent.source, parent.category, parent.description, parent.payment_method, parent.id, parent.tags];
    
    const createResult = await pool.query(createQuery, createValues);
    
    // Update parent's next occurrence date
    await pool.query('UPDATE income SET next_occurrence_date = $1 WHERE id = $2', [nextOccurrence, parent.id]);
    
    res.status(201).json({ success: true, income: createResult.rows[0], next_occurrence: nextOccurrence });
  } catch (error) {
    console.error('Create next recurring income error:', error);
    res.status(500).json({ error: 'Failed to create next recurring income', details: error.message });
  }
});

module.exports = router;
