"""Typed failure modes for the terrain proxy, so the frontend gets a clear
error code instead of a bare 500 — see `TerrainError` in schemas.py.
"""


class TerrainApiError(Exception):
    error_code: str = "upstream_error"
    status_code: int = 502

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidApiKeyError(TerrainApiError):
    error_code = "invalid_api_key"
    status_code = 502


class RateLimitedError(TerrainApiError):
    error_code = "rate_limited"
    status_code = 429


class UpstreamError(TerrainApiError):
    error_code = "upstream_error"
    status_code = 502


class InvalidRequestError(TerrainApiError):
    error_code = "invalid_request"
    status_code = 400
