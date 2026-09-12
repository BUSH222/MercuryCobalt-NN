"""GeoTIFF parsing + downsampling. Keeps `rasterio`/`numpy` contained to this
one module so the rest of the backend only ever deals with plain Python data.
"""

import numpy as np
from rasterio.io import MemoryFile

from terrain_api.schemas import TerrainBounds

MIN_GRID_SIZE = 2


def parse_and_downsample(geotiff_bytes: bytes, target_size: int) -> tuple[list[list[float]], TerrainBounds]:
    """Parses a GeoTIFF (assumed EPSG:4326, as OpenTopography's globaldem
    always returns) and resamples it down to at most `target_size` x
    `target_size` points, nearest-neighbor — plenty for a coarse horizon mask,
    and far cheaper to ship/interpolate client-side than the source raster.
    """
    with MemoryFile(geotiff_bytes) as memfile, memfile.open() as dataset:
        band = dataset.read(1).astype(np.float64)
        bounds = dataset.bounds
        nodata = dataset.nodata

    if nodata is not None:
        missing = band == nodata
        if missing.any():
            valid = band[~missing]
            fill_value = float(valid.mean()) if valid.size > 0 else 0.0
            band = np.where(missing, fill_value, band)

    rows_full, cols_full = band.shape
    target = max(min(target_size, rows_full, cols_full), MIN_GRID_SIZE)
    row_idx = np.linspace(0, rows_full - 1, target).round().astype(int)
    col_idx = np.linspace(0, cols_full - 1, target).round().astype(int)
    downsampled = band[np.ix_(row_idx, col_idx)]

    # rasterio's row 0 is the top (north) of the raster — same convention documented on TerrainGrid.
    grid_bounds = TerrainBounds(
        south_deg=bounds.bottom, north_deg=bounds.top, west_deg=bounds.left, east_deg=bounds.right
    )
    elevations_m: list[list[float]] = downsampled.tolist()
    return elevations_m, grid_bounds
