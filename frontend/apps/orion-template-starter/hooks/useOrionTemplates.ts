'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchDesignTemplates,
  OrionTemplate,
  OrionTemplateResult,
  TemplateOptions
} from '@/lib/orionTemplates';

interface UseOrionTemplatesResult {
  templates: OrionTemplate[];
  isLoading: boolean;
  error: Error | null;
  confidence: number;
  contextUsed: string[];
  lastUpdated: string | null;
  refresh: () => void;
  data?: OrionTemplateResult;
}

export const useOrionTemplates = (
  userId: string,
  options: TemplateOptions = {}
): UseOrionTemplatesResult => {
  const queryKey = useMemo(() => ['orion-templates', userId, options], [userId, options]);

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<OrionTemplateResult, Error>({
    queryKey,
    queryFn: () => fetchDesignTemplates(userId, options),
    enabled: Boolean(userId),
    placeholderData: (previousData) => previousData
  });

  return {
    templates: data?.templates ?? [],
    contextUsed: data?.contextUsed ?? [options.contextType || 'modular_design_templates'],
    confidence: data?.confidence ?? 0,
    lastUpdated: data?.timestamp ?? null,
    isLoading,
    error: error ?? null,
    refresh: () => {
      void refetch();
    },
    data
  };
};

export default useOrionTemplates;
