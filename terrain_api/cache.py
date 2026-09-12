"""Disk cache for parsed terrain grids, so re-toggling advanced mode,
restarting the dev server, or a judge re-testing the same scenario doesn't
re-hit OpenTopography (and risk its rate limit) every time.

Keyed by rounded (lat, lon) + demtype rather than the bbox extents directly —
since both the radius and demtype are fixed server-side constants, the bbox is
a deterministic function of the input coordinate, so rounding the coordinate
*is* rounding the bbox. Rounding to 3 decimal degrees (~100m) means requests
for the same station always hit the same entry despite float noise, while
genuinely different stations (which differ by whole degrees in these
scenarios) still get separate entries.
"""

import hashlib
from typing import TYPE_CHECKING

from terrain_api.config import DEM_TYPE, settings
from terrain_api.schemas import TerrainGrid

if TYPE_CHECKING:
    from pathlib import Path

COORD_ROUND_DECIMALS = 3


def _cache_key(lat_deg: float, lon_deg: float) -> str:
    rounded = f"{DEM_TYPE}:{round(lat_deg, COORD_ROUND_DECIMALS)}:{round(lon_deg, COORD_ROUND_DECIMALS)}"
    return hashlib.sha256(rounded.encode("utf-8")).hexdigest()


def _cache_path(key: str) -> Path:
    settings.cache_dir.mkdir(parents=True, exist_ok=True)
    return settings.cache_dir / f"{key}.json"


def read_cache(lat_deg: float, lon_deg: float) -> TerrainGrid | None:
    path = _cache_path(_cache_key(lat_deg, lon_deg))
    if not path.exists():
        return None
    try:
        return TerrainGrid.model_validate_json(path.read_text())
    except ValueError:
        return None  # Corrupted/stale entry — treat as a miss and let the caller re-fetch.


def write_cache(lat_deg: float, lon_deg: float, grid: TerrainGrid) -> None:
    path = _cache_path(_cache_key(lat_deg, lon_deg))
    path.write_text(grid.model_dump_json())
