/**
 * ORION Vector Search Component
 * Advanced AI-powered search interface using ORION-CORE vector search and RAG
 * Supports text, image, and semantic search with real-time results
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Camera, Mic, Sparkles, Filter, X, Zap, Brain } from 'lucide-react';
import Image from 'next/image';

// ORION-CORE integration hooks
import { useOrionSimilarity } from '@/hooks/useOrionSimilarity';
import { useOrionRecommendations } from '@/hooks/useOrionRecommendations';
import { useOrionAnalytics } from '@/hooks/useOrionAnalytics';
import { API_BASE_URL } from '@/lib/env';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  price: number;
  category: string;
  style: string;
  similarity: number;
  reason?: string;
  metadata?: Record<string, any>;
}

interface SearchFilters {
  priceRange: [number, number];
  categories: string[];
  styles: string[];
  colors: string[];
  aiScore: number;
}

interface OrionVectorSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  enableVoiceSearch?: boolean;
  enableImageSearch?: boolean;
  enableFilters?: boolean;
  maxResults?: number;
  className?: string;
}

export const OrionVectorSearch: React.FC<OrionVectorSearchProps> = ({
  onResultSelect,
  placeholder = "Search with AI-powered vector search...",
  enableVoiceSearch = true,
  enableImageSearch = true,
  enableFilters = true,
  maxResults = 20,
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'text' | 'image' | 'voice'>('text');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    priceRange: [0, 10000],
    categories: [],
    styles: [],
    colors: [],
    aiScore: 0
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // ORION-CORE hooks
  const { findSimilarByImage } = useOrionSimilarity();
  const { getRecommendations } = useOrionRecommendations();
  const { trackSearch, trackInteraction } = useOrionAnalytics();

  const transformToSearchResult = useCallback((raw: any): SearchResult => {
    const base: SearchResult = {
      id: raw.id,
      title: raw.title,
      artist: raw.artist,
      imageUrl: raw.imageUrl,
      price: raw.price ?? 0,
      category: raw.category ?? 'Unknown',
      style: raw.style ?? 'Unknown',
      similarity: raw.similarity || raw.score || 0,
      reason: raw.reason || raw.explanation,
    };

    if (raw.metadata) {
      base.metadata = raw.metadata as Record<string, any>;
    }

    return base;
  }, []);

  /**
   * Perform ORION-CORE vector search
   */
  const performVectorSearch = useCallback(async (
    searchQuery: string,
    searchFilters: SearchFilters = filters
  ): Promise<SearchResult[]> => {
    if (!searchQuery.trim()) return [];

    setIsSearching(true);

    try {
      // Call ORION-CORE vector search API
      const response = await fetch(`${API_BASE_URL}/api/ai/search/vector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          filters: {
            priceRange: searchFilters.priceRange,
            categories: searchFilters.categories.length > 0 ? searchFilters.categories : undefined,
            styles: searchFilters.styles.length > 0 ? searchFilters.styles : undefined,
            colors: searchFilters.colors.length > 0 ? searchFilters.colors : undefined,
            minAiScore: searchFilters.aiScore
          },
          limit: maxResults,
          includeReasonings: true,
          enableRAG: true,
          semanticSearch: true
        })
      });

      if (!response.ok) {
        throw new Error('Vector search failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      const searchResults: SearchResult[] = data.results.map((result: any) => transformToSearchResult(result));

      // Track search analytics
      await trackSearch(searchQuery, searchResults, {
        type: 'vector',
        filters: searchFilters,
        processingTime: data.processingTime
      });

      // Get AI suggestions for related searches
      if (data.suggestions) {
        setAiSuggestions(data.suggestions);
      }

      return searchResults;

    } catch (error) {
      console.error('ORION vector search error:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [filters, maxResults, trackSearch, transformToSearchResult]);

  /**
   * Perform image-based vector search
   */
  const performImageSearch = useCallback(async (imageFile: File): Promise<SearchResult[]> => {
    if (!imageFile) return [];

    setIsSearching(true);

    try {
      // Convert image to data URL
      const imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(imageFile);
      });

      // Use ORION similarity hook for image search
      const result = await findSimilarByImage(imageDataUrl, {
        limit: maxResults,
        threshold: 0.6,
        includeReasonings: true
      });

      if (result?.products) {
        const imageResults: SearchResult[] = result.products.map(product =>
          transformToSearchResult({
            ...product,
            category: product.metadata?.category || product.category,
            style: product.metadata?.style || product.style,
            similarity: product.similarity,
            reason: product.reason || 'Visual similarity detected',
          })
        );

        // Track image search
        await trackSearch('image_search', imageResults, {
          type: 'image',
          imageSize: imageFile.size,
          processingTime: result.processingTime
        });

        return imageResults;
      }

      return [];

    } catch (error) {
      console.error('ORION image search error:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [findSimilarByImage, maxResults, trackSearch, transformToSearchResult]);

  /**
   * Handle text search with debouncing
   */
  const handleTextSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        const searchResults = await performVectorSearch(searchQuery, filters);
        setResults(searchResults);

        // Add to search history
        if (searchQuery.trim() && !searchHistory.includes(searchQuery.trim())) {
          setSearchHistory(prev => [searchQuery.trim(), ...prev.slice(0, 9)]);
        }
      } else {
        setResults([]);
      }
    }, 300);
  }, [performVectorSearch, filters, searchHistory]);

  /**
   * Handle image upload and search
   */
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setSearchMode('image');

      const imageResults = await performImageSearch(file);
      setResults(imageResults);

      // Track image search interaction
      await trackInteraction('image_search_upload', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        resultCount: imageResults.length
      });
    }
  }, [performImageSearch, trackInteraction]);

  /**
   * Handle voice search (placeholder for future implementation)
   */
  const handleVoiceSearch = useCallback(async () => {
    setSearchMode('voice');

    // Track voice search attempt
    await trackInteraction('voice_search_attempt', {
      timestamp: Date.now(),
      searchMode: 'voice'
    });

    // Placeholder for voice search implementation
    console.log('Voice search not yet implemented');
  }, [trackInteraction]);

  /**
   * Clear search and reset state
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedImage(null);
    setSearchMode('text');
    setAiSuggestions([]);

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  /**
   * Handle result selection
   */
  const handleResultClick = useCallback(async (result: SearchResult) => {
    // Track result selection
    await trackInteraction('search_result_click', {
      resultId: result.id,
      query: query,
      similarity: result.similarity,
      position: results.findIndex(r => r.id === result.id),
      searchMode
    });

    onResultSelect?.(result);
  }, [query, results, searchMode, trackInteraction, onResultSelect]);

  // Handle query changes
  useEffect(() => {
    if (searchMode === 'text') {
      handleTextSearch(query);
    }
  }, [query, searchMode, handleTextSearch]);

  return (
    <div className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* Search Input Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {/* Main Search Bar */}
        <div className="flex items-center p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />

            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-12 pr-4 py-3 bg-transparent border-none outline-none text-lg text-gray-900 placeholder:text-gray-500 dark:text-gray-100"
              disabled={searchMode !== 'text'}
            />

            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Search Mode Controls */}
          <div className="flex items-center gap-2 ml-4">
            {enableImageSearch && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-lg border ${
                    searchMode === 'image'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                  }`}
                  title="Search by image"
                >
                  <Camera size={20} />
                </motion.button>
              </>
            )}

            {enableVoiceSearch && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVoiceSearch}
                className={`p-2 rounded-lg border ${
                  searchMode === 'voice'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                }`}
                title="Voice search"
              >
                <Mic size={20} />
              </motion.button>
            )}

            {enableFilters && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg border ${
                  showFilters
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                }`}
                title="Search filters"
              >
                <Filter size={20} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Selected Image Preview */}
        {selectedImage && searchMode === 'image' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 pb-4"
          >
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image
                  src={URL.createObjectURL(selectedImage)}
                  alt="Search image"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Searching by image</p>
                <p className="text-xs text-gray-500">{selectedImage.name}</p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 pb-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Brain size={16} className="text-purple-500" />
              <span className="text-sm font-medium text-purple-600">AI Suggestions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setQuery(suggestion)}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Search Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
          >
            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleResultClick(result)}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0"
              >
                <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                  <Image
                    src={result.imageUrl}
                    alt={result.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <h3 className="font-medium text-lg">{result.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">by {result.artist}</p>
                  {result.reason && (
                    <p className="text-xs text-purple-600 mt-1">{result.reason}</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-bold text-green-600">${result.price}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Sparkles size={12} />
                    {(result.similarity * 100).toFixed(0)}% match
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center z-50"
        >
          <div className="flex items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="text-blue-500" size={24} />
            </motion.div>
            <span className="text-lg font-medium">AI searching...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OrionVectorSearch;
