OH NO/**
 * ORION-CORE Vector Similarity Hook
 * React hook for product similarity search using ORION-CORE vector embeddings
 * Directly interfaces with ORION-CORE vector search API
 */

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { API_BASE_URL, ORION_VECTOR_URL } from '@/lib/env';

interface SimilarProduct {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  price: number;
  similarity: number;
  reason?: string;
  category?: string;
  style?: string;
  metadata?: Record<string, any>;
}

interface SimilarityOptions {
  limit?: number;
  threshold?: number;
  includeReasonings?: boolean;
  filters?: Record<string, any>;
  useCache?: boolean;
}

interface SimilarityResult {
  products: SimilarProduct[];
  query: string;
  processingTime: number;
  confidence: number;
}

export const useOrionSimilarity = (enabled: boolean = true) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [lastQuery, setLastQuery] = useState<string>('');

  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  // ORION-CORE API configuration
  const ORION_VECTOR_API = ORION_VECTOR_URL;

  /**
   * Find similar products using ORION-CORE vector search
   */
  const findSimilar = useCallback(async (
    productId: string,
    options: SimilarityOptions = {}
  ): Promise<SimilarityResult | null> => {
    if (!enabled) return null;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      // First, get the product's vector embedding
      const productResponse = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        signal: abortControllerRef.current.signal
      });

      if (!productResponse.ok) {
        throw new Error('Failed to fetch product details');
      }

      const product = await productResponse.json();

      // Search for similar products using ORION-CORE vector search
      const similarityResponse = await fetch(`${ORION_VECTOR_API}/api/vector/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${product.title} ${product.category} ${product.style}`,
          top_k: options.limit || 8,
          threshold: options.threshold || 0.7,
          filters: {
            namespace: 'marketplace_products',
            exclude_id: productId,
            ...options.filters
          },
          include_metadata: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!similarityResponse.ok) {
        throw new Error('ORION-CORE similarity search failed');
      }

      const similarityData = await similarityResponse.json();

      // Transform ORION results to our format
      const transformedProducts: SimilarProduct[] = similarityData.results?.map((result: any) => ({
        id: result.metadata?.product_id || result.id,
        title: result.metadata?.title || 'Unknown',
        artist: result.metadata?.artist || 'Unknown Artist',
        imageUrl: result.metadata?.image_url || '/placeholder.jpg',
        price: result.metadata?.price || 0,
        similarity: result.score || 0,
        category: result.metadata?.category || result.category,
        style: result.metadata?.style || result.style,
        reason: options.includeReasonings ? generateSimilarityReason(result, product) : undefined,
        metadata: result.metadata
      })) || [];

      const result: SimilarityResult = {
        products: transformedProducts,
        query: productId,
        processingTime: similarityData.processing_time || 0,
        confidence: calculateConfidence(transformedProducts)
      };

      setSimilarProducts(transformedProducts);
      setLastQuery(productId);

      // Cache the result for performance
      if (options.useCache !== false) {
        queryClient.setQueryData(['orion-similarity', productId, options], result);
      }

      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null; // Request was cancelled
      }

      const errorMessage = error.message || 'Failed to find similar products';
      setError(errorMessage);
      console.error('ORION similarity search error:', error);
      return null;

    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [enabled, ORION_VECTOR_API, queryClient]);

  /**
   * Find similar products by image using ORION-CORE CLIP embeddings
   */
  const findSimilarByImage = useCallback(async (
    imageUrl: string,
    options: SimilarityOptions = {}
  ): Promise<SimilarityResult | null> => {
    if (!enabled) return null;

    setIsLoading(true);
    setError(null);

    try {
      // Generate image embedding using ORION-CORE
      const embeddingResponse = await fetch(`${ORION_VECTOR_API}/api/embeddings/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageUrl,
          model: 'clip-vit-base-patch32'
        })
      });

      if (!embeddingResponse.ok) {
        throw new Error('Failed to generate image embedding');
      }

      const embeddingData = await embeddingResponse.json();

      // Search using the image embedding
      const searchResponse = await fetch(`${ORION_VECTOR_API}/api/vector/search-by-embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embedding: embeddingData.embedding,
          top_k: options.limit || 12,
          threshold: options.threshold || 0.6,
          namespace: 'marketplace_images',
          include_metadata: true
        })
      });

      if (!searchResponse.ok) {
        throw new Error('Visual search failed');
      }

      const searchData = await searchResponse.json();

      const transformedProducts: SimilarProduct[] = searchData.results?.map((result: any) => ({
        id: result.metadata?.product_id || result.id,
        title: result.metadata?.title || 'Unknown',
        artist: result.metadata?.artist || 'Unknown Artist',
        imageUrl: result.metadata?.image_url || '/placeholder.jpg',
        price: result.metadata?.price || 0,
        similarity: result.score || 0,
        category: result.metadata?.category || result.category,
        style: result.metadata?.style || result.style,
        reason: 'Visually similar composition and style',
        metadata: result.metadata
      })) || [];

      const result: SimilarityResult = {
        products: transformedProducts,
        query: `visual:${imageUrl}`,
        processingTime: searchData.processing_time || 0,
        confidence: calculateConfidence(transformedProducts)
      };

      setSimilarProducts(transformedProducts);
      setLastQuery(`visual:${imageUrl}`);

      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Visual search failed';
      setError(errorMessage);
      console.error('ORION visual search error:', error);
      return null;

    } finally {
      setIsLoading(false);
    }
  }, [enabled, ORION_VECTOR_API]);

  /**
   * Get cached similarity results
   */
  const getCachedSimilarity = useCallback((
    productId: string,
    options: SimilarityOptions = {}
  ) => {
    return queryClient.getQueryData(['orion-similarity', productId, options]) as SimilarityResult | undefined;
  }, [queryClient]);

  /**
   * Clear similarity results
   */
  const clearResults = useCallback(() => {
    setSimilarProducts([]);
    setLastQuery('');
    setError(null);
  }, []);

  /**
   * Prefetch similarity data for performance
   */
  const prefetchSimilarity = useCallback((
    productId: string,
    options: SimilarityOptions = {}
  ) => {
    if (!enabled) return;

    queryClient.prefetchQuery({
      queryKey: ['orion-similarity', productId, options],
      queryFn: () => findSimilar(productId, options),
      staleTime: 5 * 60 * 1000 // 5 minutes
    });
  }, [enabled, findSimilar, queryClient]);

  return {
    // State
    isLoading,
    error,
    similarProducts,
    lastQuery,

    // Actions
    findSimilar,
    findSimilarByImage,
    clearResults,
    prefetchSimilarity,

    // Utilities
    getCachedSimilarity,

    // Computed
    hasResults: similarProducts.length > 0,
    confidence: calculateConfidence(similarProducts)
  };
};

/**
 * Generate human-readable similarity reason
 */
function generateSimilarityReason(result: any, originalProduct: any): string {
  const reasons = [];

  if (result.metadata?.category === originalProduct.category) {
    reasons.push('same category');
  }

  if (result.metadata?.style === originalProduct.style) {
    reasons.push('similar style');
  }

  if (result.metadata?.artist === originalProduct.artist) {
    reasons.push('same artist');
  }

  if (result.score > 0.9) {
    reasons.push('very high similarity');
  } else if (result.score > 0.8) {
    reasons.push('high similarity');
  }

  return reasons.length > 0
    ? `Similar due to: ${reasons.join(', ')}`
    : 'AI-detected similarity';
}

/**
 * Calculate confidence score for similarity results
 */
function calculateConfidence(products: SimilarProduct[]): number {
  if (products.length === 0) return 0;

  const avgSimilarity = products.reduce((sum, p) => sum + p.similarity, 0) / products.length;
  const consistencyBonus = products.length >= 4 ? 0.1 : 0;

  return Math.min(avgSimilarity + consistencyBonus, 1);
}

export default useOrionSimilarity;
