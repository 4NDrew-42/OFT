'use client';

import { OrionTemplate } from '@/lib/orionTemplates';
import TemplateCard from './TemplateCard';

interface TemplateGridProps {
  templates: OrionTemplate[];
  activeTemplateId: string | null;
  onSelect: (template: OrionTemplate) => void;
}

const TemplateGrid = ({ templates, activeTemplateId, onSelect }: TemplateGridProps) => {
  return (
    <div className="grid-auto-fit">
      {templates.map((template, index) => (
        <TemplateCard
          key={template.id}
          template={template}
          isActive={template.id === activeTemplateId}
          onSelect={onSelect}
          index={index}
        />
      ))}
    </div>
  );
};

export default TemplateGrid;
