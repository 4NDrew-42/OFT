/**
 * AI Marketplace - Calendar Events API
 * Fabric Bridge Endpoint for Calendar CRUD Operations
 * Date: 2025-10-06
 * 
 * Integrates with:
 * - PostgreSQL (192.168.50.79:5432) - Event storage
 * - Fabric AI (optional) - Event extraction from natural language
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');

// Database configuration
const pool = new Pool({
  host: '192.168.50.79',
  port: 5432,
  database: 'orion_core',
  user: 'orion',
  password: process.env.POSTGRES_PASSWORD || 'changeme',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Fabric AI configuration (for event extraction)
const FABRIC_API = 'http://192.168.50.77:8089';

/**
 * POST /api/calendar/events - Create new event
 */
router.post('/events', async (req, res) => {
  const {
    user_email,
    title,
    description,
    location,
    start_time,
    end_time,
    all_day = false,
    timezone = 'UTC',
    tags = [],
    color,
    calendar_name = 'default',
    reminder_minutes = []
  } = req.body;
  
  // Validation
  if (!user_email || !title || !start_time) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['user_email', 'title', 'start_time']
    });
  }
  
  try {
    const insertQuery = `
      INSERT INTO calendar_events (
        user_email, title, description, location,
        start_time, end_time, all_day, timezone,
        tags, color, calendar_name, reminder_minutes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      user_email,
      title,
      description || null,
      location || null,
      start_time,
      end_time || null,
      all_day,
      timezone,
      tags,
      color || null,
      calendar_name,
      reminder_minutes
    ]);
    
    res.status(201).json({
      success: true,
      event: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      error: 'Failed to create event',
      message: error.message
    });
  }
});

/**
 * GET /api/calendar/events/:id - Get single event
 */
router.get('/events/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      success: true,
      event: result.rows[0]
    });
    
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      error: 'Failed to get event',
      message: error.message
    });
  }
});

/**
 * GET /api/calendar/events/user/:email - Get user's events
 */
router.get('/events/user/:email', async (req, res) => {
  const { email } = req.params;
  const {
    start_date,
    end_date,
    calendar_name,
    status = 'confirmed',
    limit = 100,
    offset = 0
  } = req.query;
  
  try {
    let query = 'SELECT * FROM calendar_events WHERE user_email = $1';
    const values = [email];
    let paramCount = 2;
    
    // Add filters
    if (start_date) {
      query += ` AND start_time >= $${paramCount++}`;
      values.push(start_date);
    }
    
    if (end_date) {
      query += ` AND start_time <= $${paramCount++}`;
      values.push(end_date);
    }
    
    if (calendar_name) {
      query += ` AND calendar_name = $${paramCount++}`;
      values.push(calendar_name);
    }
    
    if (status) {
      query += ` AND status = $${paramCount++}`;
      values.push(status);
    }
    
    query += ` ORDER BY start_time ASC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    values.push(limit, offset);
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      events: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({
      error: 'Failed to get events',
      message: error.message
    });
  }
});

/**
 * PUT /api/calendar/events/:id - Update event
 */
router.put('/events/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    location,
    start_time,
    end_time,
    all_day,
    timezone,
    tags,
    color,
    calendar_name,
    reminder_minutes,
    status
  } = req.body;
  
  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramCount = 1;
  
  if (title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }
  if (location !== undefined) {
    updates.push(`location = $${paramCount++}`);
    values.push(location);
  }
  if (start_time !== undefined) {
    updates.push(`start_time = $${paramCount++}`);
    values.push(start_time);
  }
  if (end_time !== undefined) {
    updates.push(`end_time = $${paramCount++}`);
    values.push(end_time);
  }
  if (all_day !== undefined) {
    updates.push(`all_day = $${paramCount++}`);
    values.push(all_day);
  }
  if (timezone !== undefined) {
    updates.push(`timezone = $${paramCount++}`);
    values.push(timezone);
  }
  if (tags !== undefined) {
    updates.push(`tags = $${paramCount++}`);
    values.push(tags);
  }
  if (color !== undefined) {
    updates.push(`color = $${paramCount++}`);
    values.push(color);
  }
  if (calendar_name !== undefined) {
    updates.push(`calendar_name = $${paramCount++}`);
    values.push(calendar_name);
  }
  if (reminder_minutes !== undefined) {
    updates.push(`reminder_minutes = $${paramCount++}`);
    values.push(reminder_minutes);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(status);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({
      error: 'No fields to update'
    });
  }
  
  values.push(id);
  
  try {
    const updateQuery = `
      UPDATE calendar_events
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      success: true,
      event: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      error: 'Failed to update event',
      message: error.message
    });
  }
});

/**
 * DELETE /api/calendar/events/:id - Delete event
 */
router.delete('/events/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      success: true,
      message: 'Event deleted successfully',
      id: id
    });
    
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

/**
 * POST /api/calendar/event_extract - Extract event from natural language
 * Uses Fabric AI pattern for intelligent event parsing
 */
router.post('/event_extract', async (req, res) => {
  const { text, user_email } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  try {
    // Try to use Fabric AI for event extraction
    try {
      const fabricResponse = await axios.post(
        `${FABRIC_API}/fabric_execute`,
        {
          pattern: 'extract_event',
          input: text
        },
        { timeout: 5000 }
      );
      
      if (fabricResponse.data && fabricResponse.data.event) {
        return res.json({
          success: true,
          event: fabricResponse.data.event,
          source: 'fabric_ai'
        });
      }
    } catch (fabricError) {
      console.log('Fabric AI unavailable, using fallback parser');
    }
    
    // Fallback: Simple regex-based extraction
    const event = {
      title: text.slice(0, 100),
      when: new Date().toISOString(),
      location: '',
      notes: text
    };
    
    // Try to extract date/time patterns
    const datePatterns = [
      /tomorrow/i,
      /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Simple date parsing (can be enhanced)
        const now = new Date();
        if (match[0].toLowerCase() === 'tomorrow') {
          now.setDate(now.getDate() + 1);
          event.when = now.toISOString();
        }
        break;
      }
    }
    
    // Try to extract location
    const locationMatch = text.match(/at\s+([^,\.]+)/i);
    if (locationMatch) {
      event.location = locationMatch[1].trim();
    }
    
    res.json({
      success: true,
      event: event,
      source: 'fallback_parser'
    });
    
  } catch (error) {
    console.error('Event extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract event',
      message: error.message
    });
  }
});

module.exports = router;

