'use client';

import { motion } from 'framer-motion';

interface TemplateHeroProps {
  onRefresh: () => void;
  loading: boolean;
}

const TemplateHero = ({ onRefresh, loading }: TemplateHeroProps) => {
  return (
    <motion.section
      className="glass-panel mb-10 overflow-hidden p-8 md:p-12"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <motion.h1
            className="text-4xl font-semibold leading-tight text-white md:text-5xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55, ease: 'easeOut' }}
          >
            Hello, ORION. Let’s compose modular, animated templates.
          </motion.h1>
          <motion.p
            className="mt-5 text-lg text-slate-300"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.55, ease: 'easeOut' }}
          >
            This Vercel-ready playground pulls inspiration directly from ORION-CORE memories,
            giving you immediately deployable patterns for motion-rich experiences.
          </motion.p>
        </div>
        <motion.button
          type="button"
          className="btn-primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Syncing templates…' : 'Regenerate via ORION-CORE'}
        </motion.button>
      </div>
    </motion.section>
  );
};

export default TemplateHero;
