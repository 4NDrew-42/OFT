'use client';

import { motion } from 'framer-motion';
import { OrionTemplate } from '@/lib/orionTemplates';

interface TemplateDetailsProps {
  template: OrionTemplate | null;
}

const detailVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 }
};

const moduleVariants = {
  initial: { opacity: 0, y: 18 },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.45, ease: 'easeOut' }
  })
};

const TemplateDetails = ({ template }: TemplateDetailsProps) => {
  if (!template) {
    return (
      <div className="glass-panel mt-10 p-8 text-slate-400">
        Select a template to inspect its ORION-generated modules.
      </div>
    );
  }

  return (
    <motion.section
      className="glass-panel mt-10 flex flex-col gap-6 p-8"
      variants={detailVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white text-glow">{template.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            {template.reason}
          </p>
        </div>
        <div className="flex flex-col items-end text-right text-xs text-slate-400">
          <span>ORION Confidence · {(template.orionScore * 100).toFixed(0)}%</span>
          <span className="text-slate-500">Modules {template.modules.length}</span>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {template.modules.map((module, index) => (
          <motion.div
            key={module.name}
            className="glass-panel border border-slate-700/40 p-5"
            variants={moduleVariants}
            initial="initial"
            animate="animate"
            custom={index}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {module.emphasis}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-white">{module.name}</h3>
            <p className="mt-3 text-sm text-slate-300">{module.description}</p>
            <div className="mt-4 text-xs text-slate-400">
              Motion signature · <span className="text-slate-200">{module.animation}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {template.insights && (
        <div className="mt-2 grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="text-xs uppercase tracking-[0.3em] text-slate-500">Best suited for</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {template.insights.bestFor.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.3em] text-slate-500">Behavior signals</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {template.insights.behaviors.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </motion.section>
  );
};

export default TemplateDetails;
