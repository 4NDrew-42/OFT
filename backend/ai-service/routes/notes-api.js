/**
 * AI Marketplace - Notes API
 * Fabric Bridge Endpoint for Notes CRUD Operations
 * Date: 2025-10-06
 * 
 * Integrates with:
 * - PostgreSQL (192.168.50.79:5432) - Note storage
 * - Qdrant (192.168.50.79:6333) - Vector embeddings
 * - ORION-PC LM Studio (192.168.50.83:1234) - Embedding generation
 */

const express = require('express');
// UUID validation function
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// UUID validation function
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const router = express.Router();
const { Pool } = require('pg');
const { QdrantClient } = require('@qdrant/js-client-rest');
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

// Qdrant configuration
const qdrant = new QdrantClient({
  url: 'http://192.168.50.79:6333',
});

const NOTES_COLLECTION = 'notes_embeddings';

// Embedding service configuration
const EMBEDDING_API = 'http://192.168.50.83:1234/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-gte-qwen2-1.5b-instruct';

/**
 * Generate embedding for text using ORION-PC LM Studio
 */
async function generateEmbedding(text) {
  try {
    const response = await axios.post(EMBEDDING_API, {
      model: EMBEDDING_MODEL,
      input: text,
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data && response.data.data && response.data.data[0]) {
      return response.data.data[0].embedding;
    }
    
    throw new Error('Invalid embedding response');
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    throw error;
  }
}

/**
 * Store embedding in Qdrant
 */
async function storeEmbedding(noteId, userEmail, title, tags, embedding) {
  try {
    await qdrant.upsert(NOTES_COLLECTION, {
      points: [{
        id: noteId,
        vector: embedding,
        payload: {
          note_id: noteId,
          user_email: userEmail,
          title: title,
          tags: tags || [],
          created_at: new Date().toISOString(),
        }
      }]
    });
    return true;
  } catch (error) {
    console.error('Qdrant storage failed:', error.message);
    throw error;
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
    
    // Insert note into PostgreSQL
    const insertQuery = `
      INSERT INTO notes (user_email, title, content, tags)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_email, title, content, tags, created_at, updated_at
    `;
    
    const result = await client.query(insertQuery, [
      user_email,
      title,
      content,
      tags || []
    ]);
    
    const note = result.rows[0];
    
    // Generate and store embedding asynchronously
    try {
      const embeddingText = `${title}\n\n${content}`;
      const embedding = await generateEmbedding(embeddingText);
      await storeEmbedding(note.id, user_email, title, tags, embedding);
      
      // Update note with embedding reference
      await client.query(
        'UPDATE notes SET vector_embedding_id = $1 WHERE id = $2',
        [note.id, note.id]
      );
    } catch (embError) {
      console.error('Embedding generation failed (non-fatal):', embError.message);
      // Continue without embedding - can be generated later
    }
    
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
 * GET /api/notes/:id - Get single note
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
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
 * GET /api/notes/user/:email - Get user's notes
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
 * PUT /api/notes/:id - Update note
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, tags } = req.body;
  
  if (!title && !content && !tags) {
    return res.status(400).json({
      error: 'No fields to update',
      allowed: ['title', 'content', 'tags']
    });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Build dynamic update query
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
    
    values.push(id);
    
    const updateQuery = `
      UPDATE notes
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const note = result.rows[0];
    
    // Regenerate embedding if content changed
    if (title || content) {
      try {
        const embeddingText = `${note.title}\n\n${note.content}`;
        const embedding = await generateEmbedding(embeddingText);
        await storeEmbedding(note.id, note.user_email, note.title, note.tags, embedding);
      } catch (embError) {
        console.error('Embedding update failed (non-fatal):', embError.message);
      }
    }
    
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
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete from Qdrant
    try {
      await qdrant.delete(NOTES_COLLECTION, {
        points: [id]
      });
    } catch (qdrantError) {
      console.error('Qdrant deletion failed (non-fatal):', qdrantError.message);
    }
    
    // Delete from PostgreSQL (cascade will handle embeddings table)
    const result = await client.query(
      'DELETE FROM notes WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Note not found' });
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Note deleted successfully',
      id: id
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

/**
 * GET /api/notes/search - Semantic search
 */
router.get('/search', async (req, res) => {
  const { q, k = 8, semantic = 'true', user_email } = req.query;
// Validate UUID if searching by ID  if (q && q.match(/^[0-9a-f]{8}-/)) {    if (!isValidUUID(q)) {      return res.status(400).json({ error: 'Invalid UUID format' });    }  }
// Validate UUID if searching by ID  if (q && q.match(/^[0-9a-f]{8}-/)) {    if (!isValidUUID(q)) {      return res.status(400).json({ error: 'Invalid UUID format' });    }  }
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  
  try {
    if (semantic === 'true') {
      // Semantic search using Qdrant
      const embedding = await generateEmbedding(q);
      
      const filter = user_email ? {
        must: [{ key: 'user_email', match: { value: user_email } }]
      } : undefined;
      
      const searchResult = await qdrant.search(NOTES_COLLECTION, {
        vector: embedding,
        limit: parseInt(k),
        filter: filter,
        with_payload: true
      });
      
      // Fetch full notes from PostgreSQL
      const noteIds = searchResult.map(r => r.payload.note_id);
      
      if (noteIds.length === 0) {
        return res.json({ success: true, items: [] });
      }
      
      const notesResult = await pool.query(
        'SELECT * FROM notes WHERE id = ANY($1::uuid[])',
        [noteIds]
      );
      
      // Add similarity scores
      const notesWithScores = notesResult.rows.map(note => {
        const match = searchResult.find(r => r.payload.note_id === note.id);
        return {
          ...note,
          similarity_score: match ? match.score : 0
        };
      });
      
      res.json({
        success: true,
        items: notesWithScores,
        search_type: 'semantic'
      });
      
    } else {
      // Full-text search using PostgreSQL
      const query = `
        SELECT *, 
          ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $1)) as rank
        FROM notes
        WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
        ${user_email ? 'AND user_email = $2' : ''}
        ORDER BY rank DESC
        LIMIT $${user_email ? 3 : 2}
      `;
      
      const values = user_email ? [q, user_email, k] : [q, k];
      const result = await pool.query(query, values);
      
      res.json({
        success: true,
        items: result.rows,
        search_type: 'fulltext'
      });
    }
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

module.exports = router;

