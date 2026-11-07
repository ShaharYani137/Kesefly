"""investApp backend API.

Serves market data, forecasts, and AI guidance to the mobile app.
Recommend-only: this service never places trades.
"""

from fastapi import FastAPI

app = FastAPI(title="investApp API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by the mobile app and deploy tooling."""
    return {"status": "ok"}
