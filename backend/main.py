from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes import upload, quality, cleaning, eda, insights, ml, xai, download
from routes import automl, anomaly, profiling, features

app = FastAPI(
    title="DataSense AI",
    description="Startup-Grade Explainable Data Quality & AutoML Platform",
    version="2.0.0",
)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)}, headers=CORS_HEADERS)

@app.options("/{full_path:path}")
async def preflight(full_path: str):
    return JSONResponse(content={}, headers=CORS_HEADERS)

# Core routes
app.include_router(upload.router,    prefix="/api", tags=["Upload"])
app.include_router(quality.router,   prefix="/api", tags=["Quality"])
app.include_router(cleaning.router,  prefix="/api", tags=["Cleaning"])
app.include_router(eda.router,       prefix="/api", tags=["EDA"])
app.include_router(insights.router,  prefix="/api", tags=["Insights"])
app.include_router(ml.router,        prefix="/api", tags=["ML"])
app.include_router(xai.router,       prefix="/api", tags=["XAI"])
app.include_router(download.router,  prefix="/api", tags=["Download"])

# Startup-grade routes
app.include_router(automl.router,    prefix="/api", tags=["AutoML Leaderboard"])
app.include_router(anomaly.router,   prefix="/api", tags=["Anomaly Detection"])
app.include_router(profiling.router, prefix="/api", tags=["Deep Profiling"])
app.include_router(features.router,  prefix="/api", tags=["Feature Engineering"])

@app.get("/")
def root():
    return {"message": "DataSense AI API v2.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy", "version": "2.0.0"}
