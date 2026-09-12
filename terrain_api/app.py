"""The terrain proxy's only real job: keep the OpenTopography API key
server-side and hand the frontend a small parsed JSON grid instead of a raw
GeoTIFF. Mirrors the frontend's `services/scenarioApi.ts` boundary — this is
the one place that knows about OpenTopography at all.
"""

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from terrain_api import cache
from terrain_api.config import BBOX_RADIUS_KM, DEM_TYPE, DOWNSAMPLE_GRID_SIZE, settings
from terrain_api.errors import TerrainApiError
from terrain_api.opentopography import bbox_for, fetch_dem_geotiff
from terrain_api.schemas import TerrainError, TerrainGrid
from terrain_api.terrain import parse_and_downsample

app = FastAPI(title="MercuryCobalt terrain proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.exception_handler(TerrainApiError)
async def terrain_error_handler(_request: Request, exc: TerrainApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=TerrainError(error=exc.error_code, message=exc.message).model_dump(),
    )


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/terrain", response_model=TerrainGrid)
async def get_terrain(
    lat: float = Query(..., ge=-90, le=90, description="Ground site latitude, degrees"),
    lon: float = Query(..., ge=-180, le=180, description="Ground site longitude, degrees"),
) -> TerrainGrid:
    cached_grid = cache.read_cache(lat, lon)
    if cached_grid is not None:
        return cached_grid.model_copy(update={"cached": True})

    bbox = bbox_for(lat, lon, BBOX_RADIUS_KM)
    geotiff_bytes = await fetch_dem_geotiff(bbox)
    elevations_m, bounds = parse_and_downsample(geotiff_bytes, DOWNSAMPLE_GRID_SIZE)
    grid = TerrainGrid(
        lat_deg=lat,
        lon_deg=lon,
        demtype=DEM_TYPE,
        bounds=bounds,
        rows=len(elevations_m),
        cols=len(elevations_m[0]) if elevations_m else 0,
        elevations_m=elevations_m,
        cached=False,
    )
    cache.write_cache(lat, lon, grid)
    return grid
