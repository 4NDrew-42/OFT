const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');

// UUID validation function
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
  try {
    const response = await axios.post('http://192.168.50.83:1234/v1/embeddings', {
      model: 'text-embedding-gte-qwen2-1.5b-instruct',
      input: text
    }, {
      timeout: 30000
    });
    
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation error:', error.message);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Store vector in Qdrant
 */
async function storeVector(noteId, embedding, metadata) {
  try {
    await axios.put(`http://192.168.50.79:6333/collections/memory_chunks_v3_1536d/points`, {
      points: [{
        id: noteId,
        vector: embedding,
        payload: metadata
      }]
    }, {
      timeout: 10000
    });
  } catch (error) {
    console.error('Qdrant store error:', error.message);
    throw new Error('Failed to store vector');
  }
}

/**
 * Search vectors in Qdrant
 */
async function searchVectors(embedding, limit = 8, filter = null) {
  try {
    const response = await axios.post(
      `http://192.168.50.79:6333/collections/memory_chunks_v3_1536d/points/search`,
      {
        vector: embedding,
        limit: limit,
        with_payload: true,
        filter: filter
      },
      { timeout: 10000 }
    );
    
    return response.data.result;
  } catch (error) {
    console.error('Qdrant search error:', error.message);
    throw new Error('Failed to search vectors');
  }
}

/**
 * POST /api/notes - Create new note
 */
router.post('/', async (req, res) => {
  const { title, content, tags, user_email } = req.body;
  
  // Validation
  if (!title || !content || !user_email) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['title', 'content', 'user_email']
    });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert note
    const result = await client.query(
      `INSERT INTO notes (title, content, tags, user_email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, content, tags || [], user_email]
    );
    
    const note = result.rows[0];
    
    // Generate embedding
    const embeddingText = `${title}\n\n${content}`;
    const embedding = await generateEmbedding(embeddingText);
    
    // Store in Qdrant
    await storeVector(note.id, embedding, {
      type: 'note',
      title: title,
      user_email: user_email,
      tags: tags || [],
      created_at: note.created_at.toISOString()
    });
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      note: note
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create note error:', error);
    res.status(500).json({
      error: 'Failed to create note',
      message: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/notes/search - Semantic search (MUST BE BEFORE /:id)
 */
router.get('/search', async (req, res) => {
  const { q, k = 8, semantic = 'true', user_email } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  
  try {
    let notes = [];
    
    if (semantic === 'true' || semantic === '1') {
      // Semantic search via Qdrant
      const embedding = await generateEmbedding(q);
      
      const filter = user_email ? {
        must: [{ key: 'user_email', match: { value: user_email } }]
      } : null;
      
      const results = await searchVectors(embedding, parseInt(k), filter);
      
      // Get full notes from PostgreSQL
      const noteIds = results.map(r => r.id);
      
      if (noteIds.length > 0) {
        const placeholders = noteIds.map((_, i) => `$${i + 1}`).join(',');
        const result = await pool.query(
          `SELECT * FROM notes WHERE id IN (${placeholders})`,
          noteIds
        );
        notes = result.rows;
      }
    } else {
      // Full-text search in PostgreSQL
      let query = `
        SELECT * FROM notes
        WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
      `;
      const params = [q];
      
      if (user_email) {
        query += ` AND user_email = $2`;
        params.push(user_email);
      }
      
      query += ` ORDER BY updated_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(k));
      
      const result = await pool.query(query, params);
      notes = result.rows;
    }
    
    res.json({
      success: true,
      notes: notes,
      count: notes.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/notes/user/:email - Get user's notes (MUST BE BEFORE /:id)
 */
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  const { limit = 50, offset = 0, sort = 'updated_at', order = 'DESC' } = req.query;
  
  try {
    const query = `
      SELECT * FROM notes
      WHERE user_email = $1
      ORDER BY ${sort} ${order}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [email, limit, offset]);
    
    res.json({
      success: true,
      notes: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Get user notes error:', error);
    res.status(500).json({
      error: 'Failed to get notes',
      message: error.message
    });
  }
});

/**
 * GET /api/notes/:id - Get single note (MUST BE AFTER /search and /user/:email)
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Validate UUID
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid note ID format' });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({
      success: true,
      note: result.rows[0]
    });
    
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      error: 'Failed to get note',
      message: error.message
    });
  }
});

/**
 * PUT /api/notes/:id - Update note
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, tags } = req.body;
  
  // Validate UUID
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid note ID format' });
  }
  
  if (!title && !content && !tags) {
    return res.status(400).json({
      error: 'No fields to update',
      allowed: ['title', 'content', 'tags']
    });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (content) {
      updates.push(`content = $${paramCount++}`);
      values.push(content);
    }
    if (tags) {
      updates.push(`tags = $${paramCount++}`);
      values.push(tags);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE notes
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const note = result.rows[0];
    
    // Update embedding
    const embeddingText = `${note.title}\n\n${note.content}`;
    const embedding = await generateEmbedding(embeddingText);
    
    await storeVector(note.id, embedding, {
      type: 'note',
      title: note.title,
      user_email: note.user_email,
      tags: note.tags || [],
      updated_at: note.updated_at.toISOString()
    });
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      note: note
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update note error:', error);
    res.status(500).json({
      error: 'Failed to update note',
      message: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/notes/:id - Delete note
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Validate UUID
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid note ID format' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'DELETE FROM notes WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Delete from Qdrant
    try {
      await axios.post(
        `http://192.168.50.79:6333/collections/memory_chunks_v3_1536d/points/delete`,
        { points: [id] },
        { timeout: 5000 }
      );
    } catch (qdrantError) {
      console.error('Qdrant delete error:', qdrantError.message);
      // Continue anyway - PostgreSQL is source of truth
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete note error:', error);
    res.status(500).json({
      error: 'Failed to delete note',
      message: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
