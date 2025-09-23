'use client';

import { motion } from 'framer-motion';

interface OrionStatusBadgeProps {
  context: string;
  confidence: number;
  lastUpdated: string | null;
}

const formatConfidence = (value: number) => `${Math.round(value * 100)}%`;

const formatTime = (timestamp: string | null) => {
  if (!timestamp) return 'awaiting sync';
  try {
    const date = new Date(timestamp);
    return `${date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  } catch (error) {
    console.error('Failed to format ORION timestamp', error);
    return 'unavailable';
  }
};

export const OrionStatusBadge = ({ context, confidence, lastUpdated }: OrionStatusBadgeProps) => {
  return (
    <motion.div
      className="badge"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-emerald-500 shadow-sm" />
      <span className="uppercase tracking-[0.3em] text-xs text-slate-300">ORION-CORE RAG</span>
      <span className="text-slate-100 font-semibold">Confidence {formatConfidence(confidence)}</span>
      <span className="text-slate-400">Context · {context}</span>
      <span className="text-slate-500">Updated {formatTime(lastUpdated)}</span>
    </motion.div>
  );
};

export default OrionStatusBadge;
