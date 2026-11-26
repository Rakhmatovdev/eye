import { MapPin, Network, Radar, TrendingUp, Sigma, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PatternType } from './api';
import type { TKey } from './i18n';

// Shared display mapping for AI-detected patterns (dashboard card + /patterns
// page): type -> i18n key / icon, and score -> color band. Kept as pure
// helpers (no React) so they're trivial to unit test.
export const PATTERN_TYPE_KEY: Record<PatternType, TKey> = {
  co_location: 'patterns_type_co_location',
  hub_entity: 'patterns_type_hub_entity',
  threat_correlation: 'patterns_type_threat_correlation',
  burst_activity: 'patterns_type_burst_activity',
  statistical_outlier: 'patterns_type_statistical_outlier',
};

export const PATTERN_TYPE_ICON: Record<PatternType, LucideIcon> = {
  co_location: MapPin,
  hub_entity: Network,
  threat_correlation: Radar,
  burst_activity: TrendingUp,
  statistical_outlier: Sigma,
};

export const PATTERN_FALLBACK_ICON: LucideIcon = Sparkles;

export function scoreColorClass(score: number): string {
  if (score >= 75) return 'text-[var(--accent-red-soft)]';
  if (score >= 50) return 'text-[var(--accent-amber-soft)]';
  return 'text-[var(--accent-emerald-soft)]';
}

export function scoreBarColorClass(score: number): string {
  if (score >= 75) return 'bg-red-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}
