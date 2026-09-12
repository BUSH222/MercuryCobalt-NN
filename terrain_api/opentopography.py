"""Bounding-box math and the OpenTopography `globaldem` client. The API key
lives only here (and in config.py) — it never leaves the backend process."""

import math

import httpx

from terrain_api.config import DEM_TYPE, HTTP_TIMEOUT_S, OPENTOPOGRAPHY_URL, settings
from terrain_api.errors import InvalidApiKeyError, InvalidRequestError, RateLimitedError, UpstreamError

KM_PER_DEG_LAT = 111.32


def bbox_for(lat_deg: float, lon_deg: float, radius_km: float) -> tuple[float, float, float, float]:
    """A small (south, north, west, east) box centered on (lat, lon). Longitude
    degrees shrink toward the poles (by cos(latitude)), so a radius that's
    naively applied to both axes would badly distort the box at the high
    latitudes these ground sites tend to sit at — this accounts for that."""
    if not (-90 <= lat_deg <= 90) or not (-180 <= lon_deg <= 180):
        raise InvalidRequestError(f"Coordinates out of range: lat={lat_deg}, lon={lon_deg}")
    lat_span = radius_km / KM_PER_DEG_LAT
    km_per_deg_lon = max(KM_PER_DEG_LAT * math.cos(math.radians(lat_deg)), 1e-6)
    lon_span = radius_km / km_per_deg_lon
    south = max(lat_deg - lat_span, -90.0)
    north = min(lat_deg + lat_span, 90.0)
    west = lon_deg - lon_span
    east = lon_deg + lon_span
    return south, north, west, east


async def fetch_dem_geotiff(bbox: tuple[float, float, float, float]) -> bytes:
    """Fetches a COP30 GeoTIFF for the given (south, north, west, east) bbox
    from OpenTopography, raising a typed `TerrainApiError` on any failure."""
    if not settings.opentopography_api_key:
        raise InvalidApiKeyError("OPENTOPOGRAPHY_API_KEY is not configured on the server")

    south, north, west, east = bbox
    params = {
        "demtype": DEM_TYPE,
        "south": south,
        "north": north,
        "west": west,
        "east": east,
        "outputFormat": "GTiff",
        "API_Key": settings.opentopography_api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as client:
            response = await client.get(OPENTOPOGRAPHY_URL, params=params)
    except httpx.RequestError as exc:
        raise UpstreamError(f"Could not reach OpenTopography: {exc}") from exc

    if response.status_code == 200:
        return response.content

    detail = response.text[:300]
    if response.status_code in (401, 403):
        raise InvalidApiKeyError(f"OpenTopography rejected the API key (HTTP {response.status_code}): {detail}")
    if response.status_code == 429:
        raise RateLimitedError(f"OpenTopography rate limit hit (HTTP 429): {detail}")
    if 400 <= response.status_code < 500:
        raise InvalidRequestError(f"OpenTopography rejected the request (HTTP {response.status_code}): {detail}")
    raise UpstreamError(f"OpenTopography upstream error (HTTP {response.status_code}): {detail}")
