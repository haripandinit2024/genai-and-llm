"""FastAPI entrypoint for the Multicode Agent backend."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import catalog, chat, health, run, tools
from app.core import config
from app.services.presets import PRESETS

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s - %(message)s")

app = FastAPI(
    title=config.APP_NAME,
    description=config.APP_DESCRIPTION,
    version=config.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(catalog.router)
app.include_router(chat.router)
app.include_router(run.router)
app.include_router(tools.router)


@app.exception_handler(Exception)
async def unhandled_exception(_request, exc: Exception) -> JSONResponse:  # pragma: no cover
    logging.getLogger("multicode").exception("unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check the backend logs for details."},
    )


@app.get("/api", summary="API index")
def api_index() -> dict:
    return {
        "name": config.APP_NAME,
        "version": config.APP_VERSION,
        "presets": len(PRESETS),
        "docs": "/docs",
        "endpoints": [
            "GET /api/health",
            "GET /api/agents",
            "GET /api/presets",
            "POST /api/chat",
            "POST /api/run",
            "POST /api/refactor",
            "POST /api/explain",
            "GET /api/sandbox",
        ],
    }


# Serve the compiled studio bundle when it exists (single-command deployment).
_DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _DIST_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_DIST_DIR), html=True), name="studio")
else:

    @app.get("/", summary="Service root")
    def root() -> dict:
        return {
            "status": "ok",
            "service": "multicode-agent",
            "version": config.APP_VERSION,
            "docs": "/docs",
            "studio": "run `npm run dev` inside frontend/ and open http://localhost:5174",
        }


def main() -> None:  # pragma: no cover - convenience runner
    import uvicorn

    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT, reload=True)


if __name__ == "__main__":  # pragma: no cover
    main()
