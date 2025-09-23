export interface OrionTemplateModule {
  name: string;
  description: string;
  animation: string;
  emphasis: 'layout' | 'media' | 'motion' | 'copy';
}

export interface OrionTemplate {
  id: string;
  name: string;
  summary: string;
  reason: string;
  palette: string[];
  motionPresets: string[];
  modules: OrionTemplateModule[];
  tags: string[];
  contextType: string;
  orionScore: number;
  previewImage?: string;
  insights?: {
    bestFor: string[];
    behaviors: string[];
  };
}

export interface TemplateOptions {
  limit?: number;
  contextType?: string;
  diversityWeight?: number;
  timeWindow?: string;
  includeModules?: boolean;
}

export interface OrionTemplateResult {
  templates: OrionTemplate[];
  contextUsed: string[];
  confidence: number;
  timestamp: string;
}

const DEFAULT_CONTEXT = 'modular_design_templates';

const FALLBACK_TEMPLATES: OrionTemplate[] = [
  {
    id: 'orion-fallback-aurora',
    name: 'Aurora Bloom Landing',
    summary:
      'Floating cards with layered parallax and gradient blooms for visual-first hero experiences.',
    reason:
      'Generated via ORION-CORE RAG using recent art showcase interactions and high-engagement landing patterns.',
    palette: ['#6366F1', '#8B5CF6', '#0EA5E9', '#0F172A'],
    motionPresets: ['parallax-float', 'fade-in-up', 'staggered-cards'],
    modules: [
      {
        name: 'Hero Mosaic',
        description: 'Three-card hero layout with staggered depth and hover elevation.',
        animation: 'parallax-float',
        emphasis: 'layout'
      },
      {
        name: 'Artist Spotlight Rail',
        description: 'Horizontal carousel for emerging creators with kinetic blur transitions.',
        animation: 'panorama-loop',
        emphasis: 'media'
      },
      {
        name: 'Insight Pulse',
        description: 'Animated metrics band that pulses in sync with engagement spikes.',
        animation: 'metric-pulse',
        emphasis: 'motion'
      }
    ],
    tags: ['landing', 'parallax', 'hero', 'motion'],
    contextType: DEFAULT_CONTEXT,
    orionScore: 0.88,
    insights: {
      bestFor: ['Campaign launches', 'High-visual brands'],
      behaviors: ['High scroll depth', 'Strong hover interactions']
    }
  },
  {
    id: 'orion-fallback-nebula',
    name: 'Nebula Story Carousel',
    summary:
      'Immersive storytelling canvas with progressive disclosure and scroll-linked motion.',
    reason:
      'Built from ORION-CORE memories tagged "immersive narrative" to accelerate editorial design sprints.',
    palette: ['#1E1B4B', '#312E81', '#6366F1', '#14B8A6'],
    motionPresets: ['scroll-linked-panels', 'depth-reveal', 'glow-trace'],
    modules: [
      {
        name: 'Narrative Spine',
        description: 'Vertical timeline with orbiting content clusters tied to scroll position.',
        animation: 'scroll-linked-panels',
        emphasis: 'layout'
      },
      {
        name: 'Motion Glyphs',
        description: 'Vector glyphs that sweep across panels triggered by analytics milestones.',
        animation: 'glow-trace',
        emphasis: 'motion'
      },
      {
        name: 'Call-to-Action Dock',
        description: 'Persistent CTA column that adapts messaging based on viewer profile.',
        animation: 'cta-dock-shift',
        emphasis: 'copy'
      }
    ],
    tags: ['storytelling', 'scroll', 'editorial'],
    contextType: DEFAULT_CONTEXT,
    orionScore: 0.83,
    insights: {
      bestFor: ['Product storytelling', 'Brand journeys'],
      behaviors: ['Moderate dwell time', 'Sequential narrative exploration']
    }
  },
  {
    id: 'orion-fallback-lumen',
    name: 'Lumen Modular Grid',
    summary:
      'Responsive grid with swap-in modules and adaptive color grading synced to analytics.',
    reason:
      'Assembled from ORION RAG vector matches on modular grids with high conversion lift.',
    palette: ['#0F172A', '#1E293B', '#38BDF8', '#FBBF24'],
    motionPresets: ['tile-swap', 'light-sweep', 'gradient-shift'],
    modules: [
      {
        name: 'Dynamic Tiles',
        description: 'Auto-curated cards that shuffle order based on recommendation confidence.',
        animation: 'tile-swap',
        emphasis: 'layout'
      },
      {
        name: 'Metric Spotlight',
        description: 'Top-right analytics pod with light sweep and orbiting KPI markers.',
        animation: 'light-sweep',
        emphasis: 'motion'
      },
      {
        name: 'Palette Sync',
        description: 'Background gradient that shifts in response to ORION preference clusters.',
        animation: 'gradient-shift',
        emphasis: 'media'
      }
    ],
    tags: ['grid', 'dashboard', 'modular'],
    contextType: DEFAULT_CONTEXT,
    orionScore: 0.9,
    insights: {
      bestFor: ['Marketplace home', 'Template galleries'],
      behaviors: ['High revisit rate', 'Module interaction']
    }
  }
];

const ensurePalette = (palette: string[] | undefined, fallback: string[]) => {
  if (!palette || palette.length === 0) {
    return fallback;
  }
  return palette.slice(0, 5);
};

const normalizeModules = (modules: any[] | undefined, fallback: OrionTemplateModule[]): OrionTemplateModule[] => {
  if (!modules || modules.length === 0) {
    return fallback;
  }

  return modules.map((module, index) => ({
    name: module.name || module.title || `Module ${index + 1}`,
    description: module.description || module.summary || 'Modular block generated via ORION-CORE RAG.',
    animation: module.animation || module.motion || 'dynamic-fade',
    emphasis:
      module.emphasis && ['layout', 'media', 'motion', 'copy'].includes(module.emphasis)
        ? module.emphasis
        : (['layout', 'media', 'motion', 'copy'][index % 4] as OrionTemplateModule['emphasis'])
  }));
};

const mapRecommendationToTemplate = (recommendation: any, index: number): OrionTemplate => {
  const fallback = FALLBACK_TEMPLATES[index % FALLBACK_TEMPLATES.length];
  return {
    id: recommendation.id || fallback.id,
    name: recommendation.title || recommendation.name || fallback.name,
    summary: recommendation.description || recommendation.summary || fallback.summary,
    reason:
      recommendation.reason ||
      recommendation.explanation ||
      `Sourced from ORION-CORE memory cluster ${recommendation.context || 'creative_templates'}.`,
    palette: ensurePalette(recommendation.palette || recommendation.colors, fallback.palette),
    motionPresets:
      recommendation.motionPresets ||
      recommendation.motion ||
      recommendation.animations ||
      fallback.motionPresets,
    modules: normalizeModules(recommendation.modules, fallback.modules),
    tags: recommendation.tags || fallback.tags,
    contextType: recommendation.contextType || recommendation.context || DEFAULT_CONTEXT,
    orionScore: recommendation.orionScore || recommendation.confidence || fallback.orionScore,
    previewImage: recommendation.imageUrl || recommendation.previewImage,
    insights: {
      bestFor: recommendation.bestFor || fallback.insights?.bestFor || [],
      behaviors: recommendation.behaviors || fallback.insights?.behaviors || []
    }
  };
};

const buildResponse = (templates: OrionTemplate[]): OrionTemplateResult => ({
  templates,
  contextUsed: templates.map((template) => template.contextType),
  confidence:
    templates.reduce((total, template) => total + template.orionScore, 0) /
      Math.max(templates.length, 1) || 0,
  timestamp: new Date().toISOString()
});

const getEndpoint = () => {
  const base =
    process.env.NEXT_PUBLIC_ORION_TEMPLATE_ENDPOINT ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001/api/ai';
  return base.replace(/\/$/, '');
};

export const fetchDesignTemplates = async (
  userId: string,
  options: TemplateOptions = {}
): Promise<OrionTemplateResult> => {
  const endpoint = getEndpoint();
  const contextType = options.contextType || DEFAULT_CONTEXT;

  try {
    const res = await fetch(`${endpoint}/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        context: contextType,
        limit: options.limit || 6,
        diversityWeight: options.diversityWeight ?? 0.4,
        timeWindow: options.timeWindow || '30d',
        includeReasons: true,
        includeModules: options.includeModules ?? true,
        updateProfile: false,
        enhanced: true
      })
    });

    if (!res.ok) {
      console.warn('ORION templates request failed:', res.statusText);
      return buildResponse(FALLBACK_TEMPLATES);
    }

    const data = await res.json();

    if (!data?.success) {
      console.warn('ORION templates response marked unsuccessful');
      return buildResponse(FALLBACK_TEMPLATES);
    }

    const incoming = Array.isArray(data.recommendations)
      ? data.recommendations
      : Array.isArray(data.templates)
        ? data.templates
        : null;

    if (!incoming) {
      console.warn('ORION templates response missing recommendation data shape');
      return buildResponse(FALLBACK_TEMPLATES);
    }

    const templates = incoming.map((rec: any, index: number) =>
      mapRecommendationToTemplate(rec, index)
    );
    const apiResponse = buildResponse(templates.length > 0 ? templates : FALLBACK_TEMPLATES);
    apiResponse.contextUsed =
      (Array.isArray(data.contextUsed) && data.contextUsed.length > 0
        ? data.contextUsed
        : Array.isArray(data.context)
          ? data.context
          : apiResponse.contextUsed) || [contextType];
    apiResponse.confidence =
      data.confidence || data.metadata?.confidence || apiResponse.confidence;
    return apiResponse;
  } catch (error) {
    console.error('ORION template fetch error:', error);
    return buildResponse(FALLBACK_TEMPLATES);
  }
};
