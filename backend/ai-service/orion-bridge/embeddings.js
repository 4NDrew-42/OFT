/**
 * ORION-CORE Embeddings Bridge
 * Advanced embedding generation with MCP memory integration
 */

const axios = require('axios');

class OrionEmbeddings {
  constructor() {
    this.orionVectorUrl = process.env.ORION_VECTOR_API_BASE || 'http://192.168.50.79:8081';
    this.orionEmbeddingUrl = process.env.ORION_EMBEDDING_API_BASE || 'http://192.168.50.79:8091';
    this.orionMcpUrl = process.env.ORION_MCP_URL || 'http://localhost:8090';

    // Embedding models configuration
    this.models = {
      text: 'sentence-transformers/all-mpnet-base-v2',
      image: 'clip-vit-base-patch32',
      multimodal: 'clip-vit-large-patch14'
    };

    this.mcpClient = this.initializeMcpClient();
  }

  /**
   * Initialize MCP client for extended memory operations
   */
  initializeMcpClient() {
    return {
      storeEmbedding: async (content, embedding, metadata = {}) => {
        try {
          const response = await axios.post(`${this.orionMcpUrl}/api/mcp/store-embedding`, {
            content,
            embedding,
            metadata: {
              ...metadata,
              embedding_model: this.models.text,
              dimension: embedding.length,
              timestamp: new Date().toISOString(),
              source: 'ai-marketplace'
            }
          });
          return response.data;
        } catch (error) {
          console.error('MCP Embedding storage error:', error);
          return { success: false, error: error.message };
        }
      },

      retrieveEmbeddings: async (filters = {}) => {
        try {
          const response = await axios.post(`${this.orionMcpUrl}/api/mcp/retrieve-embeddings`, {
            filters,
            include_vectors: true
          });
          return response.data;
        } catch (error) {
          console.error('MCP Embedding retrieval error:', error);
          return { embeddings: [], error: error.message };
        }
      }
    };
  }

  /**
   * Generate embeddings for product descriptions
   * @param {string} text - Product description or content
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Embedding result
   */
  async generateTextEmbedding(text, metadata = {}) {
    try {
      const response = await axios.post(`${this.orionEmbeddingUrl}/embeddings`, {
        input: text,
        model: this.models.text,
        encoding_format: 'float'
      });

      if (!response.data.data || !response.data.data[0]) {
        throw new Error('Invalid embedding response format');
      }

      const embedding = response.data.data[0].embedding;

      // Store in MCP memory for future reference and RAG
      await this.mcpClient.storeEmbedding(text, embedding, {
        ...metadata,
        type: 'text_embedding',
        model_used: this.models.text,
        content_type: 'product_description',
        processing_timestamp: new Date().toISOString()
      });

      return {
        success: true,
        embedding,
        dimension: embedding.length,
        model: this.models.text,
        content: text,
        metadata
      };

    } catch (error) {
      console.error('Text embedding generation error:', error);
      return {
        success: false,
        error: error.message,
        embedding: null
      };
    }
  }

  /**
   * Generate embeddings for images using CLIP
   * @param {string} imageData - Base64 or URL of image
   * @param {Object} metadata - Image metadata
   * @returns {Promise<Object>} Image embedding result
   */
  async generateImageEmbedding(imageData, metadata = {}) {
    try {
      const response = await axios.post(`${this.orionVectorUrl}/api/embeddings/image`, {
        image: imageData,
        model: this.models.image,
        include_metadata: true
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Image embedding generation failed');
      }

      const embedding = response.data.embedding;

      // Store image embedding in MCP memory
      await this.mcpClient.storeEmbedding(
        `Image embedding: ${metadata.filename || 'unknown'}`,
        embedding,
        {
          ...metadata,
          type: 'image_embedding',
          model_used: this.models.image,
          content_type: 'artwork_image',
          image_dimensions: response.data.image_info?.dimensions,
          processing_timestamp: new Date().toISOString()
        }
      );

      return {
        success: true,
        embedding,
        dimension: embedding.length,
        model: this.models.image,
        image_info: response.data.image_info,
        metadata
      };

    } catch (error) {
      console.error('Image embedding generation error:', error);
      return {
        success: false,
        error: error.message,
        embedding: null
      };
    }
  }

  /**
   * Generate combined text + image embeddings for products
   * @param {Object} product - Product with text and image data
   * @returns {Promise<Object>} Combined embedding result
   */
  async generateProductEmbedding(product) {
    try {
      const { title, description, imageUrl, category, style, artist } = product;

      // Combine text fields for comprehensive description
      const fullText = [
        title,
        description,
        `Category: ${category}`,
        `Style: ${style}`,
        `Artist: ${artist}`
      ].filter(Boolean).join(' ');

      // Generate text embedding
      const textEmbedding = await this.generateTextEmbedding(fullText, {
        product_id: product.id,
        category,
        style,
        artist,
        embedding_type: 'product_text'
      });

      let imageEmbedding = null;
      if (imageUrl) {
        // Generate image embedding
        imageEmbedding = await this.generateImageEmbedding(imageUrl, {
          product_id: product.id,
          category,
          style,
          artist,
          image_url: imageUrl,
          embedding_type: 'product_image'
        });
      }

      // Create combined embedding strategy
      let combinedEmbedding = null;
      if (textEmbedding.success && imageEmbedding?.success) {
        // Weighted combination of text and image embeddings
        combinedEmbedding = this.combineEmbeddings(
          textEmbedding.embedding,
          imageEmbedding.embedding,
          { text_weight: 0.6, image_weight: 0.4 }
        );

        // Store combined embedding in MCP
        await this.mcpClient.storeEmbedding(
          `Combined product embedding: ${title}`,
          combinedEmbedding,
          {
            product_id: product.id,
            type: 'combined_embedding',
            content_type: 'full_product',
            has_text: true,
            has_image: true,
            processing_timestamp: new Date().toISOString()
          }
        );
      }

      return {
        success: true,
        product_id: product.id,
        embeddings: {
          text: textEmbedding.success ? textEmbedding.embedding : null,
          image: imageEmbedding?.success ? imageEmbedding.embedding : null,
          combined: combinedEmbedding
        },
        metadata: {
          text_success: textEmbedding.success,
          image_success: imageEmbedding?.success || false,
          combined_available: !!combinedEmbedding,
          full_text: fullText
        }
      };

    } catch (error) {
      console.error('Product embedding generation error:', error);
      return {
        success: false,
        error: error.message,
        product_id: product.id
      };
    }
  }

  /**
   * Batch process embeddings for multiple products
   * @param {Array} products - Array of products to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Batch processing result
   */
  async batchGenerateEmbeddings(products, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: products.length,
      processing_time: Date.now()
    };

    const batchSize = options.batchSize || 10;
    const concurrent = options.concurrent || 3;

    // Process in batches to avoid overwhelming the services
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      // Process batch with limited concurrency
      const batchPromises = batch.map(async (product, index) => {
        try {
          // Add delay to prevent rate limiting
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 100 * index));
          }

          const result = await this.generateProductEmbedding(product);
          return { product, result };
        } catch (error) {
          return { product, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Categorize results
      batchResults.forEach(promiseResult => {
        if (promiseResult.status === 'fulfilled') {
          const { product, result, error } = promiseResult.value;
          if (result?.success) {
            results.successful.push({ product, result });
          } else {
            results.failed.push({ product, error: error || result?.error });
          }
        } else {
          results.failed.push({
            product: null,
            error: promiseResult.reason.message
          });
        }
      });

      // Progress callback if provided
      if (options.onProgress) {
        options.onProgress({
          completed: Math.min(i + batchSize, products.length),
          total: products.length,
          successful: results.successful.length,
          failed: results.failed.length
        });
      }
    }

    results.processing_time = Date.now() - results.processing_time;

    // Store batch processing summary in MCP memory
    await this.mcpClient.storeEmbedding(
      `Batch embedding processing completed: ${results.successful.length}/${results.total} successful`,
      [], // Empty embedding for metadata-only storage
      {
        type: 'batch_processing_summary',
        total_products: results.total,
        successful_count: results.successful.length,
        failed_count: results.failed.length,
        processing_time_ms: results.processing_time,
        batch_size: batchSize,
        processing_timestamp: new Date().toISOString()
      }
    );

    return results;
  }

  /**
   * Combine text and image embeddings with weights
   * @param {Array} textEmbedding - Text embedding vector
   * @param {Array} imageEmbedding - Image embedding vector
   * @param {Object} weights - Combination weights
   * @returns {Array} Combined embedding vector
   */
  combineEmbeddings(textEmbedding, imageEmbedding, weights = { text_weight: 0.5, image_weight: 0.5 }) {
    if (!textEmbedding || !imageEmbedding) {
      return textEmbedding || imageEmbedding;
    }

    // Ensure embeddings are same dimension (pad or truncate if necessary)
    const maxLength = Math.max(textEmbedding.length, imageEmbedding.length);
    const normalizedText = this.normalizeEmbedding(textEmbedding, maxLength);
    const normalizedImage = this.normalizeEmbedding(imageEmbedding, maxLength);

    // Weighted combination
    return normalizedText.map((val, idx) =>
      val * weights.text_weight + normalizedImage[idx] * weights.image_weight
    );
  }

  /**
   * Normalize embedding to target dimension
   * @param {Array} embedding - Input embedding
   * @param {number} targetDim - Target dimension
   * @returns {Array} Normalized embedding
   */
  normalizeEmbedding(embedding, targetDim) {
    if (embedding.length === targetDim) {
      return embedding;
    }

    if (embedding.length > targetDim) {
      // Truncate
      return embedding.slice(0, targetDim);
    } else {
      // Pad with zeros
      return [...embedding, ...new Array(targetDim - embedding.length).fill(0)];
    }
  }

  /**
   * Retrieve similar embeddings from MCP memory
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Similar embeddings
   */
  async findSimilarEmbeddings(queryEmbedding, filters = {}) {
    try {
      const response = await this.mcpClient.retrieveEmbeddings({
        ...filters,
        similarity_threshold: filters.threshold || 0.7,
        max_results: filters.limit || 20
      });

      if (!response.embeddings) {
        return { success: false, error: 'No embeddings retrieved', results: [] };
      }

      // Calculate cosine similarity with query embedding
      const results = response.embeddings.map(item => ({
        ...item,
        similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
      }))
      .filter(item => item.similarity >= (filters.threshold || 0.7))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, filters.limit || 20);

      return {
        success: true,
        results,
        total: results.length,
        query_dimension: queryEmbedding.length
      };

    } catch (error) {
      console.error('Similar embeddings search error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vecA - First vector
   * @param {Array} vecB - Second vector
   * @returns {number} Cosine similarity score
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Health check for embedding services
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const [embeddingHealth, vectorHealth] = await Promise.allSettled([
        axios.get(`${this.orionEmbeddingUrl}/health`),
        axios.get(`${this.orionVectorUrl}/health`)
      ]);

      return {
        embedding_service: {
          status: embeddingHealth.status === 'fulfilled' ? 'healthy' : 'error',
          url: this.orionEmbeddingUrl,
          error: embeddingHealth.status === 'rejected' ? embeddingHealth.reason.message : null
        },
        vector_service: {
          status: vectorHealth.status === 'fulfilled' ? 'healthy' : 'error',
          url: this.orionVectorUrl,
          error: vectorHealth.status === 'rejected' ? vectorHealth.reason.message : null
        },
        models: this.models,
        overall_status: (embeddingHealth.status === 'fulfilled' &&
                        vectorHealth.status === 'fulfilled') ? 'healthy' : 'degraded'
      };
    } catch (error) {
      return {
        overall_status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = OrionEmbeddings;