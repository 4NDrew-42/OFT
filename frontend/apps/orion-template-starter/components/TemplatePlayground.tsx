'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import useOrionTemplates from '@/hooks/useOrionTemplates';
import TemplateHero from './TemplateHero';
import TemplateGrid from './TemplateGrid';
import TemplateDetails from './TemplateDetails';
import OrionStatusBadge from './OrionStatusBadge';

const DEFAULT_USER = 'designer-hello';

const backgroundVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 1.2, ease: 'easeOut' } }
};

const TemplatePlayground = () => {
  const [userId] = useState(DEFAULT_USER);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const { templates, isLoading, error, refresh, confidence, contextUsed, lastUpdated } =
    useOrionTemplates(userId, {
      contextType: 'modular_design_templates',
      limit: 6,
      includeModules: true
    });

  useEffect(() => {
    if (templates.length === 0) return;
    if (!activeTemplateId) {
      setActiveTemplateId(templates[0].id);
      return;
    }
    const stillExists = templates.some((template) => template.id === activeTemplateId);
    if (!stillExists) {
      setActiveTemplateId(templates[0].id);
    }
  }, [templates, activeTemplateId]);

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === activeTemplateId) ?? null,
    [templates, activeTemplateId]
  );

  return (
    <div className="relative">
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[520px] w-[70%] rounded-full bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent blur-3xl"
        variants={backgroundVariants}
        initial="initial"
        animate="animate"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <OrionStatusBadge
          context={contextUsed[0] ?? 'modular_design_templates'}
          confidence={confidence}
          lastUpdated={lastUpdated}
        />

        <TemplateHero onRefresh={refresh} loading={isLoading} />

        {error ? (
          <div className="glass-panel border border-red-500/40 px-6 py-4 text-sm text-red-200">
            ORION sync issue · {error.message}
          </div>
        ) : null}

        <TemplateGrid
          templates={templates}
          activeTemplateId={activeTemplateId}
          onSelect={(template) => setActiveTemplateId(template.id)}
        />

        <TemplateDetails template={activeTemplate} />
      </div>
    </div>
  );
};

export default TemplatePlayground;
