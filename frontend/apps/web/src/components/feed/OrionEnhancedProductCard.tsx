/**
 * ORION-Enhanced Product Card Component
 * Leverages ORION-CORE vector search for smart recommendations and AI-powered interactions
 * Created using patterns from ORION-CORE memory system
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Image from 'next/image';
import { Heart, Share2, Eye, Zap, Sparkles } from 'lucide-react';

// ORION-CORE integration hooks
import { useOrionSimilarity } from '@/hooks/useOrionSimilarity';
import { useOrionRecommendations } from '@/hooks/useOrionRecommendations';
import { useOrionAnalytics } from '@/hooks/useOrionAnalytics';

interface Product {
  id: string;
  title: string;
  artist: string;
  price: number;
  imageUrl: string;
  category: string;
  style: string;
  colors: string[];
  tags: string[];
  aiScore?: number;
  similarity?: number;
  orionMetadata?: {
    embeddingId: string;
    vectorScore: number;
    recommendationReason: string;
  };
}

interface OrionEnhancedProductCardProps {
  product: Product;
  index: number;
  onInteraction?: (type: string, data: any) => void;
  enableAIFeatures?: boolean;
  showSimilarProducts?: boolean;
  motionPreset?: 'subtle' | 'dynamic' | 'dramatic';
}

export const OrionEnhancedProductCard: React.FC<OrionEnhancedProductCardProps> = ({
  product,
  index,
  onInteraction,
  enableAIFeatures = true,
  showSimilarProducts = true,
  motionPreset = 'dynamic'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [viewDuration, setViewDuration] = useState(0);
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Intersection observer for view tracking
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false
  });

  // Motion values for advanced animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [30, -30]);
  const rotateY = useTransform(x, [-100, 100], [-30, 30]);

  // ORION-CORE integration hooks
  const {
    findSimilar,
    similarProducts,
    isLoading: similarLoading
  } = useOrionSimilarity(enableAIFeatures);

  const {
    getRecommendations,
    recommendations,
    confidence
  } = useOrionRecommendations(enableAIFeatures);

  const {
    trackInteraction,
    trackView,
    getInsights
  } = useOrionAnalytics();

  // Track view duration and ORION analytics
  useEffect(() => {
    if (!inView) {
      return;
    }

    const startTime = Date.now();
    trackView(product.id, {
      index,
      category: product.category,
      style: product.style,
      aiScore: product.aiScore,
    });

    return () => {
      const duration = Date.now() - startTime;
      setViewDuration(duration);

      if (duration > 1000) {
        trackInteraction('product_view', {
          productId: product.id,
          duration,
          hovered: isHovered,
          category: product.category,
          vectorScore: product.orionMetadata?.vectorScore,
        });
      }
    };
  }, [inView, index, isHovered, product.aiScore, product.category, product.id, product.orionMetadata?.vectorScore, product.style, trackInteraction, trackView]);

  const loadAIInsights = useCallback(async () => {
    try {
      // Get insights from ORION-CORE about this product
      const insights = await getInsights(product.id, {
        includeStyleAnalysis: true,
        includeColorPreferences: true,
        includeSimilarityReasons: true
      });

      setAiInsights(insights);

      // Load similar products if enabled
      if (showSimilarProducts) {
        await findSimilar(product.id, {
          limit: 4,
          threshold: 0.7,
          includeReasonings: true
        });
      }
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    }
  }, [product.id, getInsights, findSimilar, showSimilarProducts]);

  // Load AI insights when card becomes visible
  useEffect(() => {
    if (inView && enableAIFeatures && !aiInsights) {
      loadAIInsights();
    }
  }, [aiInsights, enableAIFeatures, inView, loadAIInsights]);

  // Handle hover interactions with ORION tracking
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    trackInteraction('card_hover', {
      productId: product.id,
      timestamp: Date.now(),
      aiScore: product.aiScore
    });
  }, [product.id, product.aiScore, trackInteraction]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Handle like interaction with ORION learning
  const handleLike = useCallback(async () => {
    setIsLiked(!isLiked);

    // Track preference in ORION-CORE for personalization
    await trackInteraction('product_like', {
      productId: product.id,
      liked: !isLiked,
      category: product.category,
      style: product.style,
      colors: product.colors,
      aiScore: product.aiScore,
      userPreferences: {
        implicitFeedback: true,
        confidenceLevel: 'high'
      }
    });

    // Trigger recommendation update
    if (enableAIFeatures && !isLiked) {
      getRecommendations(product.id, {
        contextType: 'liked_product',
        updateUserProfile: true
      });
    }

    onInteraction?.('like', { productId: product.id, liked: !isLiked });
  }, [isLiked, product, trackInteraction, getRecommendations, enableAIFeatures, onInteraction]);

  // Motion variants based on preset
  const cardVariants = {
    subtle: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      hover: { y: -4, scale: 1.02 },
      tap: { scale: 0.98 }
    },
    dynamic: {
      initial: { opacity: 0, y: 50, rotateX: -15 },
      animate: { opacity: 1, y: 0, rotateX: 0 },
      hover: { y: -8, scale: 1.03, rotateX: 5 },
      tap: { scale: 0.95 }
    },
    dramatic: {
      initial: { opacity: 0, scale: 0.8, rotateY: -45 },
      animate: { opacity: 1, scale: 1, rotateY: 0 },
      hover: { scale: 1.05, rotateY: 10, z: 50 },
      tap: { scale: 0.9 }
    }
  };

  const currentVariants = cardVariants[motionPreset];

  return (
    <motion.div
      ref={inViewRef}
      variants={currentVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: index * 0.1 // Stagger animation
      }}
      style={{
        perspective: 1000,
        rotateX,
        rotateY
      }}
      className="group relative bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(e.clientX - centerX);
        y.set(e.clientY - centerY);
      }}
    >
      {/* AI Enhancement Indicator */}
      {enableAIFeatures && product.orionMetadata && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-2 left-2 z-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1"
        >
          <Sparkles size={12} />
          AI Enhanced
        </motion.div>
      )}

      {/* Image Container with Motion Effects */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <motion.div
          animate={{
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{ duration: 0.4 }}
          className="w-full h-full"
        >
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={index < 6} // Prioritize first 6 images
          />
        </motion.div>

        {/* Hover Overlay with AI Insights */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLike}
                  className={`p-3 rounded-full backdrop-blur-sm transition-all ${
                    isLiked
                      ? 'bg-red-500 text-white'
                      : 'bg-white bg-opacity-80 text-gray-800 hover:bg-opacity-100'
                  }`}
                >
                  <Heart size={20} fill={isLiked ? 'white' : 'none'} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-3 rounded-full bg-white bg-opacity-80 text-gray-800 hover:bg-opacity-100 backdrop-blur-sm transition-all"
                >
                  <Share2 size={20} />
                </motion.button>

                {enableAIFeatures && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => findSimilar(product.id)}
                    className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white backdrop-blur-sm"
                  >
                    <Zap size={20} />
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Similarity Score */}
        {product.similarity && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium"
          >
            {(product.similarity * 100).toFixed(0)}% match
          </motion.div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-4">
        <motion.h3
          className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors"
          layoutId={`title-${product.id}`}
        >
          {product.title}
        </motion.h3>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
          by {product.artist}
        </p>

        <div className="flex items-center justify-between">
          <motion.span
            className="text-xl font-bold text-green-600"
            layoutId={`price-${product.id}`}
          >
            ${product.price}
          </motion.span>

          {enableAIFeatures && aiInsights && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-blue-600 text-sm"
            >
              <Eye size={14} />
              <span>{aiInsights.viewCount} views</span>
            </motion.div>
          )}
        </div>

        {/* AI-Powered Insights */}
        {enableAIFeatures && aiInsights && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {aiInsights.recommendationReason || 'Recommended based on your preferences'}
            </p>

            {aiInsights.colorPalette && (
              <div className="flex gap-1 mt-2">
                {aiInsights.colorPalette.slice(0, 4).map((color: string, i: number) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Similar Products Panel */}
      <AnimatePresence>
        {showSimilarProducts && similarProducts.length > 0 && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700"
          >
            <p className="text-sm font-medium mb-2">Similar artworks:</p>
            <div className="flex gap-2 overflow-x-auto">
              {similarProducts.map((similar, i) => (
                <motion.div
                  key={similar.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                >
                  <Image
                    src={similar.imageUrl}
                    alt={similar.title}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OrionEnhancedProductCard;
