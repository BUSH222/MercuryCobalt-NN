"""Response shapes for the terrain endpoint. The frontend never sees a raw
GeoTIFF — only this compact JSON, sized for cheap client-side interpolation.
"""

from pydantic import BaseModel


class TerrainBounds(BaseModel):
    south_deg: float
    north_deg: float
    west_deg: float
    east_deg: float


class TerrainGrid(BaseModel):
    lat_deg: float
    lon_deg: float
    demtype: str
    bounds: TerrainBounds
    rows: int
    cols: int
    """Row-major elevation grid in meters, `rows` rows of `cols` values each.
    Row 0 corresponds to `bounds.north_deg`, row `rows-1` to `bounds.south_deg`
    (i.e. same top-to-bottom convention as the source raster); column 0 is
    `bounds.west_deg`."""
    elevations_m: list[list[float]]
    cached: bool


class TerrainError(BaseModel):
    error: str
    message: str
