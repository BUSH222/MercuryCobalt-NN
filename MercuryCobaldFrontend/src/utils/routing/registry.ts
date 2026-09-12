/**
 * Single lookup from a selected algorithm id to its implementation — the only
 * place that knows about all four strategies at once, and it's a plain map,
 * not a branching God-function. Swapping the mock in for a real backend later
 * means adding one more entry here (a strategy that calls `fetch` instead of
 * searching a local graph), not touching this file's callers.
 */
import type { RoutingAlgorithmId } from "../../domain";
import type { PathfindingStrategy } from "./types";
import { bfsByHops } from "./bfsByHops";
import { dijkstraByDistance } from "./dijkstraByDistance";
import { widestPathByMargin } from "./widestPathByMargin";
import { greedyBaseline } from "./greedyBaseline";

export const ROUTING_STRATEGIES: Record<RoutingAlgorithmId, PathfindingStrategy> = {
  "shortest-distance": dijkstraByDistance,
  "fewest-hops": bfsByHops,
  "widest-margin": widestPathByMargin,
  "greedy-baseline": greedyBaseline,
};
