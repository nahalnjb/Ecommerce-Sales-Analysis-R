from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path

from app.config import OUTPUTS_DIR, PROJECT_ROOT
from app.database import init_db, SessionLocal
from app.routers import datasets, r_engine, analytics, history, reports, settings
from app.services.seed_scripts import seed_predefined_scripts
from app.routers.datasets import load_sample_dataset

app = FastAPI(
    title="E-Commerce Sales Analysis & Customer Segmentation Platform",
    description="Enterprise Analytics Engine driven by real R programming, statistical forecasting and RFM segmentation.",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount outputs directory for plots, downloads, and artifacts
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")

# Include Routers
app.include_router(datasets.router)
app.include_router(r_engine.router)
app.include_router(analytics.router)
app.include_router(history.router)
app.include_router(reports.router)
app.include_router(settings.router)

# Mount frontend production build if available
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static_assets")

@app.on_event("startup")
def startup_event():
    init_db()
    db = SessionLocal()
    try:
        seed_predefined_scripts(db)
        try:
            load_sample_dataset(db)
        except Exception as e:
            print(f"Sample dataset load warning: {e}")
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "engine": "R-FastAPI-Hybrid"}

# Catch-all for SPA client-side routing
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Don't intercept API or outputs paths
    if full_path.startswith("api/") or full_path.startswith("outputs/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return {"error": "Not Found"}
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "status": "online",
        "service": "E-Commerce RFM Analytics Engine",
        "version": "2.0.0",
        "docs": "/docs"
    }
