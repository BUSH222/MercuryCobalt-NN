/**
 * The one place that knows the terrain backend exists — mirrors
 * `services/scenarioApi.ts`'s role as the data-access boundary, just for a
 * real (non-mocked) HTTP call instead of a client-side computation. Calls a
 * relative path so the same code works against nginx's `/api/` proxy in
 * Docker and Vite's dev-server proxy locally (see vite.config.ts) — no base
 * URL, no CORS, no environment branching in this module.
 */
import type { TerrainApiError, TerrainGrid } from "./types";

export class TerrainFetchError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TerrainFetchError";
    this.code = code;
  }
}

export async function fetchTerrainGrid(latDeg: number, lonDeg: number): Promise<TerrainGrid> {
  const params = new URLSearchParams({ lat: String(latDeg), lon: String(lonDeg) });
  let response: Response;
  try {
    response = await fetch(`/api/terrain?${params.toString()}`);
  } catch {
    throw new TerrainFetchError("network_error", "Не удалось связаться с сервисом рельефа");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as TerrainApiError | null;
    throw new TerrainFetchError(body?.error ?? "upstream_error", body?.message ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as TerrainGrid;
}
