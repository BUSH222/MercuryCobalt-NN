/**
 * A candidate plane layout proposed by the coverage optimizer (see
 * "utils/coverageOptimizer.ts"). Altitude and inclination are never touched —
 * only each plane's RAAN and phase, expressed as a spacing between
 * consecutive planes (the two degrees of freedom that actually move the
 * needle on a full-day horizon; see the engineering note in
 * coverageOptimizer.ts for why a rigid whole-constellation RAAN rotation does not).
 */
export interface CoveragePlaneAdjustment {
  plane_id: string;
  raan_deg: number;
  phase_deg: number;
}

export interface CoverageCandidate {
  id: string;
  raan_spacing_deg: number;
  phase_spacing_deg: number;
  planes: CoveragePlaneAdjustment[];
  worst_visibility_fraction: number;
  mean_visibility_fraction: number;
  worst_availability_fraction: number;
  mean_availability_fraction: number;
  per_client_availability_fraction: Record<string, number>;
}
