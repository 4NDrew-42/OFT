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

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// CREATE: Add new budget
router.post('/', async (req, res) => {
  console.log("POST /api/budgets - Body:", JSON.stringify(req.body));
  const { user_email, category, monthly_limit, start_date, end_date, alert_threshold } = req.body;
  
  if (!user_email || !category || !monthly_limit || !start_date) {
    return res.status(400).json({ error: 'Missing required fields: user_email, category, monthly_limit, start_date' });
  }
  
  try {
    const query = `
      INSERT INTO budgets (user_email, category, monthly_limit, start_date, end_date, alert_threshold)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [user_email, category, monthly_limit, start_date, end_date, alert_threshold || 80];
    
    const result = await pool.query(query, values);
    res.status(201).json({ success: true, budget: result.rows[0] });
  } catch (error) {
    console.error('Create budget error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Budget already exists for this category and start date' });
    }
    res.status(500).json({ error: 'Failed to create budget', details: error.message });
  }
});

// READ: Get user's budgets
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  const { is_active } = req.query;
  
  try {
    let query = 'SELECT * FROM budgets WHERE user_email = $1';
    const values = [email];
    
    if (is_active !== undefined) {
      query += ' AND is_active = $2';
      values.push(is_active === 'true');
    }
    
    query += ' ORDER BY category ASC';
    
    const result = await pool.query(query, values);
    res.json({ success: true, budgets: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to fetch budgets', details: error.message });
  }
});

// READ: Get budget status with spending
router.get('/status/:email', async (req, res) => {
  const { email } = req.params;
  const { month, year } = req.query;
  
  try {
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();
    
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];
    
    // Get active budgets
    const budgetsQuery = `
      SELECT * FROM budgets 
      WHERE user_email = $1 
      AND is_active = TRUE
      AND start_date <= $2
      AND (end_date IS NULL OR end_date >= $2)
    `;
    const budgetsResult = await pool.query(budgetsQuery, [email, startDate]);
    
    // Get spending by category for the month
    const spendingQuery = `
      SELECT category, SUM(amount) as spent
      FROM expenses
      WHERE user_email = $1
      AND expense_date >= $2
      AND expense_date <= $3
      GROUP BY category
    `;
    const spendingResult = await pool.query(spendingQuery, [email, startDate, endDate]);
    
    // Combine budgets with spending
    const spendingMap = {};
    spendingResult.rows.forEach(row => {
      spendingMap[row.category] = parseFloat(row.spent);
    });
    
    const budgetStatus = budgetsResult.rows.map(budget => {
      const spent = spendingMap[budget.category] || 0;
      const limit = parseFloat(budget.monthly_limit);
      const percentage = (spent / limit) * 100;
      const remaining = limit - spent;
      
      return {
        ...budget,
        spent: spent.toFixed(2),
        remaining: remaining.toFixed(2),
        percentage: percentage.toFixed(1),
        status: percentage >= 100 ? 'over' : percentage >= budget.alert_threshold ? 'warning' : 'ok'
      };
    });
    
    res.json({ success: true, budgets: budgetStatus, month: targetMonth, year: targetYear });
  } catch (error) {
    console.error('Get budget status error:', error);
    res.status(500).json({ error: 'Failed to fetch budget status', details: error.message });
  }
});

// READ: Get single budget by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid budget ID format' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    res.json({ success: true, budget: result.rows[0] });
  } catch (error) {
    console.error('Get budget by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch budget', details: error.message });
  }
});

// UPDATE: Update budget
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { category, monthly_limit, start_date, end_date, alert_threshold, is_active } = req.body;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid budget ID format' });
  }
  
  try {
    const query = `
      UPDATE budgets
      SET category = COALESCE($1, category),
          monthly_limit = COALESCE($2, monthly_limit),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date),
          alert_threshold = COALESCE($5, alert_threshold),
          is_active = COALESCE($6, is_active)
      WHERE id = $7
      RETURNING *
    `;
    const values = [category, monthly_limit, start_date, end_date, alert_threshold, is_active, id];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    res.json({ success: true, budget: result.rows[0] });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Failed to update budget', details: error.message });
  }
});

// DELETE: Delete budget
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid budget ID format' });
  }
  
  try {
    const result = await pool.query('DELETE FROM budgets WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    res.json({ success: true, message: 'Budget deleted successfully', budget: result.rows[0] });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Failed to delete budget', details: error.message });
  }
});

module.exports = router;
