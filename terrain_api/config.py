"""Configuration for the terrain proxy. Everything that isn't a per-request
parameter lives here as a constant/setting rather than being exposed to the
frontend — the client only ever sends a lat/lon; dataset choice, bbox size,
and downsampling are server-side decisions.
"""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parent.parent

# OpenTopography "globaldem" dataset identifier. Copernicus GLO-30 (COP30),
# ~30m posting — a good balance of local-horizon fidelity vs. payload/compute
# size for this use case.
DEM_TYPE = "COP30"
OPENTOPOGRAPHY_URL = "https://portal.opentopography.org/API/globaldem"

# Half-width of the bounding box fetched around each ground site, in
# kilometers. Local horizon obstructions rarely matter much beyond this;
# tens of km is enough to catch nearby terrain/mountains without pulling a
# huge tile. Not user-configurable by design (see HOW_IT_WORKS.md).
BBOX_RADIUS_KM = 30.0

# The elevation grid returned to the frontend is downsampled to at most this
# many points per side (i.e. up to DOWNSAMPLE_GRID_SIZE**2 total) — cheap for
# the frontend to turn into a heightfield mesh, plenty for a coarse horizon
# profile that was never meant to be photorealistic.
DOWNSAMPLE_GRID_SIZE = 64

HTTP_TIMEOUT_S = 30.0


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    # Optional at the settings level on purpose: a missing key must surface as
    # a per-request "invalid_api_key" error from `/api/terrain` (see
    # opentopography.py), not crash the whole process at import time — the
    # rest of the app (health checks, CORS, everything else) works fine
    # without it, and a container that fails to boot without a secret is a
    # much worse failure mode than one endpoint returning a clear error.
    opentopography_api_key: str | None = Field(default=None, alias="OPENTOPOGRAPHY_API_KEY")
    # Comma-separated list of extra allowed CORS origins, on top of the
    # Vite dev server defaults below (e.g. for a deployed frontend origin).
    terrain_api_cors_origins: str = Field(default="", alias="TERRAIN_API_CORS_ORIGINS")
    cache_dir: Path = Field(default=REPO_ROOT / ".terrain_cache", alias="TERRAIN_CACHE_DIR")

    @property
    def cors_origins(self) -> list[str]:
        defaults = ["http://localhost:5173", "http://127.0.0.1:5173"]
        extra = [origin.strip() for origin in self.terrain_api_cors_origins.split(",") if origin.strip()]
        return [*defaults, *extra]


settings = Settings()
