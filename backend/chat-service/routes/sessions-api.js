/**
 * Chat Sessions API Routes - SECURED
 *
 * CRITICAL SECURITY UPDATE:
 * - All routes protected by JWT middleware (req.jwtPayload available)
 * - Single-user enforcement (only authorized user can access)
 * - userId validation (must match JWT sub claim)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

const AUTHORIZED_USER = (process.env.AUTHORIZED_USER_EMAIL || 'jamesandrewklein@gmail.com').toLowerCase();

/**
 * POST /api/sessions/create - Create new chat session
 *
 * Body: { userId: string, firstMessage?: string }
 * Returns: ChatSession object
 */
router.post('/create', async (req, res) => {
  const { userId, firstMessage } = req.body;

  // CRITICAL: Extract authenticated userId from JWT (set by middleware)
  const authenticatedUser = req.jwtPayload.sub.toLowerCase();

  // CRITICAL: Reject if request userId doesn't match JWT sub
  if (userId && userId.toLowerCase() !== authenticatedUser) {
    return res.status(403).json({
      error: 'userId mismatch',
      message: 'Request userId must match authenticated user'
    });
  }

  // CRITICAL: Enforce single-user
  if (authenticatedUser !== AUTHORIZED_USER) {
    return res.status(403).json({
      error: 'Unauthorized user',
      message: `Only ${AUTHORIZED_USER} is authorized`
    });
  }

  // Force userId to authenticated user (ignore any provided value)
  const safeUserId = authenticatedUser;
  
  try {
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Generate title from first message or use default
    let title = 'New Chat';
    if (firstMessage && firstMessage.trim()) {
      // Use first 50 characters of first message as title
      title = firstMessage.trim().substring(0, 50);
      if (firstMessage.length > 50) title += '...';
    }
    
    const query = `
      INSERT INTO chat_sessions (
        session_id, 
        user_id, 
        title, 
        first_message, 
        last_message, 
        message_count
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        session_id AS "sessionId",
        user_id AS "userId",
        title,
        first_message AS "firstMessage",
        last_message AS "lastMessage",
        message_count AS "messageCount",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        metadata
    `;
    
    const values = [
      sessionId,
      safeUserId, // Use authenticated userId, not request userId
      title,
      firstMessage || '',
      firstMessage || '',
      firstMessage ? 1 : 0
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error.message
    });
  }
});

/**
 * GET /api/sessions/list - Get all sessions for authenticated user
 *
 * CRITICAL: Ignores provided userId, uses authenticated user from JWT
 *
 * Query params:
 *   - startDate (optional, ISO string)
 *   - endDate (optional, ISO string)
 *   - limit (optional, number)
 *   - sortBy (optional, 'createdAt' | 'updatedAt')
 *   - sortOrder (optional, 'asc' | 'desc')
 *
 * Returns: { sessions: ChatSession[] }
 */
router.get('/list', async (req, res) => {
  const {
    startDate,
    endDate,
    limit = 100,
    sortBy = 'updatedAt',
    sortOrder = 'desc'
  } = req.query;

  // CRITICAL: Use authenticated user from JWT, ignore query param
  const authenticatedUser = req.jwtPayload.sub.toLowerCase();

  // CRITICAL: Enforce single-user
  if (authenticatedUser !== AUTHORIZED_USER) {
    return res.status(403).json({
      error: 'Unauthorized user',
      message: `Only ${AUTHORIZED_USER} is authorized`
    });
  }

  try {
    let query = `
      SELECT
        session_id AS "sessionId",
        user_id AS "userId",
        title,
        first_message AS "firstMessage",
        last_message AS "lastMessage",
        message_count AS "messageCount",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        metadata
      FROM chat_sessions
      WHERE user_id = $1
    `;

    const values = [authenticatedUser]; // Use authenticated user, not query param
    let paramIndex = 2;
    
    // Add date filtering
    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }
    
    // Add sorting
    const validSortFields = ['createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    // Convert camelCase to snake_case for SQL
    const sqlSortField = sortField === 'createdAt' ? 'created_at' : 'updated_at';
    query += ` ORDER BY ${sqlSortField} ${sortDirection}`;
    
    // Add limit
    query += ` LIMIT $${paramIndex}`;
    values.push(parseInt(limit));
    
    const result = await pool.query(query, values);
    
    res.json({
      sessions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to get sessions',
      message: error.message
    });
  }
});

/**
 * GET /api/sessions/messages - Get all messages for a session
 * 
 * Query params: sessionId (required)
 * Returns: { messages: ChatMessage[] }
 */
router.get('/messages', async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({
      error: 'Missing required query parameter: sessionId'
    });
  }

  // CRITICAL: Verify session belongs to authenticated user
  const authenticatedUser = req.jwtPayload.sub.toLowerCase();

  // CRITICAL: Enforce single-user
  if (authenticatedUser !== AUTHORIZED_USER) {
    return res.status(403).json({
      error: 'Unauthorized user',
      message: `Only ${AUTHORIZED_USER} is authorized`
    });
  }

  try {
    // First, verify session ownership
    const sessionCheck = await pool.query(
      'SELECT user_id FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // CRITICAL: Verify session belongs to authenticated user
    if (sessionCheck.rows[0].user_id.toLowerCase() !== authenticatedUser) {
      return res.status(403).json({
        error: 'Unauthorized access to session',
        message: 'Session does not belong to authenticated user'
      });
    }

    const query = `
      SELECT
        message_id AS "id",
        session_id AS "sessionId",
        role,
        content,
        created_at AS "timestamp",
        metadata
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [sessionId]);

    res.json({
      messages: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: error.message
    });
  }
});

/**
 * POST /api/sessions/save-message - Save a message to a session
 * 
 * Body: { sessionId: string, role: 'user' | 'assistant', content: string, metadata?: object }
 * Returns: ChatMessage object
 */
router.post('/save-message', async (req, res) => {
  const { sessionId, role, content, metadata } = req.body;

  if (!sessionId || !role || !content) {
    return res.status(400).json({
      error: 'Missing required fields: sessionId, role, content'
    });
  }

  if (!['user', 'assistant'].includes(role)) {
    return res.status(400).json({
      error: 'Invalid role. Must be "user" or "assistant"'
    });
  }

  // CRITICAL: Verify session belongs to authenticated user
  const authenticatedUser = req.jwtPayload.sub.toLowerCase();

  // CRITICAL: Enforce single-user
  if (authenticatedUser !== AUTHORIZED_USER) {
    return res.status(403).json({
      error: 'Unauthorized user',
      message: `Only ${AUTHORIZED_USER} is authorized`
    });
  }

  try {
    // First, verify session ownership
    const sessionCheck = await pool.query(
      'SELECT user_id FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // CRITICAL: Verify session belongs to authenticated user
    if (sessionCheck.rows[0].user_id.toLowerCase() !== authenticatedUser) {
      return res.status(403).json({
        error: 'Unauthorized access to session',
        message: 'Session does not belong to authenticated user'
      });
    }

    // Generate message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Insert message
    const insertQuery = `
      INSERT INTO chat_messages (
        message_id,
        session_id,
        role,
        content,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        message_id AS "id",
        session_id AS "sessionId",
        role,
        content,
        created_at AS "timestamp",
        metadata
    `;
    
    const insertValues = [
      messageId,
      sessionId,
      role,
      content,
      metadata || {}
    ];
    
    const result = await pool.query(insertQuery, insertValues);
    
    // Update session's last_message and message_count
    const updateQuery = `
      UPDATE chat_sessions
      SET 
        last_message = $1,
        message_count = message_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $2
    `;
    
    await pool.query(updateQuery, [content, sessionId]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Save message error:', error);
    res.status(500).json({
      error: 'Failed to save message',
      message: error.message
    });
  }
});

/**
 * POST /api/sessions/delete - Delete a session and all its messages
 * 
 * Body: { sessionId: string }
 * Returns: { success: true, message: string }
 */
router.post('/delete', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      error: 'Missing required field: sessionId'
    });
  }

  // CRITICAL: Verify session belongs to authenticated user
  const authenticatedUser = req.jwtPayload.sub.toLowerCase();

  // CRITICAL: Enforce single-user
  if (authenticatedUser !== AUTHORIZED_USER) {
    return res.status(403).json({
      error: 'Unauthorized user',
      message: `Only ${AUTHORIZED_USER} is authorized`
    });
  }

  try {
    // First, verify session ownership
    const sessionCheck = await pool.query(
      'SELECT user_id FROM chat_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // CRITICAL: Verify session belongs to authenticated user
    if (sessionCheck.rows[0].user_id.toLowerCase() !== authenticatedUser) {
      return res.status(403).json({
        error: 'Unauthorized access to session',
        message: 'Session does not belong to authenticated user'
      });
    }

    // Delete session (messages will be cascade deleted)
    const query = `
      DELETE FROM chat_sessions
      WHERE session_id = $1
      RETURNING session_id
    `;

    const result = await pool.query(query, [sessionId]);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      error: 'Failed to delete session',
      message: error.message
    });
  }
});

/**
 * GET /api/sessions/:sessionId - Get single session details
 * 
 * Params: sessionId
 * Returns: ChatSession object
 */
router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const query = `
      SELECT 
        session_id AS "sessionId",
        user_id AS "userId",
        title,
        first_message AS "firstMessage",
        last_message AS "lastMessage",
        message_count AS "messageCount",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        metadata
      FROM chat_sessions
      WHERE session_id = $1
    `;
    
    const result = await pool.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Session not found' 
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      error: 'Failed to get session',
      message: error.message
    });
  }
});

module.exports = router;
