'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { OrionTemplate } from '@/lib/orionTemplates';

interface TemplateCardProps {
  template: OrionTemplate;
  isActive: boolean;
  onSelect: (template: OrionTemplate) => void;
  index: number;
}

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.05,
      duration: 0.45,
      ease: [0.35, 0.17, 0.3, 0.86]
    }
  }),
  hover: { scale: 1.02, y: -6 }
};

const TemplateCard = ({ template, isActive, onSelect, index }: TemplateCardProps) => {
  return (
    <motion.article
      className={clsx(
        'glass-panel relative flex cursor-pointer flex-col gap-4 p-6 transition-colors duration-200',
        isActive ? 'ring-2 ring-slate-100/60 shadow-neon' : 'ring-1 ring-slate-700/40'
      )}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      custom={index}
      onClick={() => onSelect(template)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white text-glow">{template.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{template.summary}</p>
        </div>
        <span className="rounded-full border border-slate-700/60 px-3 py-1 text-xs uppercase tracking-wide text-slate-400">
          {template.contextType.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        {template.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-slate-700/50 px-2 py-1">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        {template.palette.map((color) => (
          <span
            key={color}
            className="h-7 w-7 rounded-full border border-slate-800"
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>

      <div className="mt-4 text-xs text-slate-400">
        <p className="font-semibold uppercase tracking-widest text-slate-300">Motion presets</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {template.motionPresets.map((preset) => (
            <span
              key={preset}
              className="rounded-full bg-slate-800/60 px-2 py-1 font-medium text-slate-200"
            >
              {preset}
            </span>
          ))}
        </div>
      </div>

      <motion.div
        className="absolute inset-0 -z-10 rounded-[22px] opacity-0"
        animate={{ opacity: isActive ? 0.35 : 0 }}
        transition={{ duration: 0.45 }}
        style={{
          background:
            'radial-gradient(circle at top left, rgba(99,102,241,0.35), transparent 55%)'
        }}
      />
    </motion.article>
  );
};

export default TemplateCard;
