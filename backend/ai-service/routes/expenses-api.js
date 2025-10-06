const express = require('express');
const router = express.Router();
const pool = require('../db');

// Validate UUID format
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * POST /api/expenses - Create new expense
 */
router.post('/', async (req, res) => {
  console.log("POST /api/expenses - Body:", JSON.stringify(req.body));
  const { user_email, amount, expense_date, category, merchant, description, payment_method, receipt_image_data, tags } = req.body;
  
  if (!user_email || !amount || !expense_date) {
    return res.status(400).json({ error: 'Missing required fields: user_email, amount, expense_date' });
  }
  
  try {
    const query = `
      INSERT INTO expenses (user_email, amount, expense_date, category, merchant, description, payment_method, receipt_image_data, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      user_email,
      amount,
      expense_date,
      category || null,
      merchant || null,
      description || null,
      payment_method || null,
      receipt_image_data || null,
      tags || []
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      error: 'Failed to create expense',
      message: error.message
    });
  }
});

/**
 * GET /api/expenses/user/:email - Get user's expenses
 */
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  const { 
    limit = 100, 
    offset = 0, 
    sort = 'expense_date', 
    order = 'DESC',
    category,
    start_date,
    end_date,
    payment_method
  } = req.query;
  
  try {
    let query = `
      SELECT * FROM expenses
      WHERE user_email = $1
    `;
    
    const values = [email];
    let paramIndex = 2;
    
    // Add filters
    if (category) {
      query += ` AND category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND expense_date >= $${paramIndex}`;
      values.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND expense_date <= $${paramIndex}`;
      values.push(end_date);
      paramIndex++;
    }
    
    if (payment_method) {
      query += ` AND payment_method = $${paramIndex}`;
      values.push(payment_method);
      paramIndex++;
    }
    
    query += ` ORDER BY ${sort} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);
    
    const result = await pool.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM expenses WHERE user_email = $1';
    const countValues = [email];
    
    if (category || start_date || end_date || payment_method) {
      let countParamIndex = 2;
      if (category) {
        countQuery += ` AND category = $${countParamIndex}`;
        countValues.push(category);
        countParamIndex++;
      }
      if (start_date) {
        countQuery += ` AND expense_date >= $${countParamIndex}`;
        countValues.push(start_date);
        countParamIndex++;
      }
      if (end_date) {
        countQuery += ` AND expense_date <= $${countParamIndex}`;
        countValues.push(end_date);
        countParamIndex++;
      }
      if (payment_method) {
        countQuery += ` AND payment_method = $${countParamIndex}`;
        countValues.push(payment_method);
        countParamIndex++;
      }
    }
    
    const countResult = await pool.query(countQuery, countValues);
    
    res.json({
      success: true,
      expenses: result.rows,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get user expenses error:', error);
    res.status(500).json({
      error: 'Failed to get expenses',
      message: error.message
    });
  }
});

/**
 * GET /api/expenses/summary/:email - Get expense summary by category
 */
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
      FROM expenses
      WHERE user_email = $1
    `;
    
    const values = [email];
    let paramIndex = 2;
    
    if (start_date) {
      query += ` AND expense_date >= $${paramIndex}`;
      values.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND expense_date <= $${paramIndex}`;
      values.push(end_date);
      paramIndex++;
    }
    
    query += ` GROUP BY category ORDER BY total DESC`;
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      summary: result.rows
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({
      error: 'Failed to get expense summary',
      message: error.message
    });
  }
});

/**
 * GET /api/expenses/:id - Get single expense
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid expense ID format' });
  }
  
  try {
    const query = 'SELECT * FROM expenses WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({
      success: true,
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      error: 'Failed to get expense',
      message: error.message
    });
  }
});

/**
 * PUT /api/expenses/:id - Update expense
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, expense_date, category, merchant, description, payment_method, receipt_image_data, tags } = req.body;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid expense ID format' });
  }
  
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }
    
    if (expense_date !== undefined) {
      updates.push(`expense_date = $${paramIndex}`);
      values.push(expense_date);
      paramIndex++;
    }
    
    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }
    
    if (merchant !== undefined) {
      updates.push(`merchant = $${paramIndex}`);
      values.push(merchant);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (payment_method !== undefined) {
      updates.push(`payment_method = $${paramIndex}`);
      values.push(payment_method);
      paramIndex++;
    }
    
    if (receipt_image_data !== undefined) {
      updates.push(`receipt_image_data = $${paramIndex}`);
      values.push(receipt_image_data);
      paramIndex++;
    }
    
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      values.push(tags);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    const query = `
      UPDATE expenses
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({
      success: true,
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      error: 'Failed to update expense',
      message: error.message
    });
  }
});

/**
 * DELETE /api/expenses/:id - Delete expense
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid expense ID format' });
  }
  
  try {
    const query = 'DELETE FROM expenses WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      error: 'Failed to delete expense',
      message: error.message
    });
  }
});

module.exports = router;
