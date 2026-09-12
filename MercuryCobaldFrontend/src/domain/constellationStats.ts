/**
 * Constellation-wide figures computed once per time step across every
 * client, rather than duplicated per client.
 */
export interface ConstellationStepStats {
  t_s: number;
  /** Satellite id -> number of clients currently using it as a first/last hop. */
  satellite_load: Record<string, number>;
  mean_visible_satellites: number;
}
