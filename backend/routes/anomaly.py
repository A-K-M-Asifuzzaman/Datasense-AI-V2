"""Anomaly detection route."""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from routes.upload import DATA_STORE
from services.anomaly import detect_anomalies

router = APIRouter()
CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"}


@router.get("/anomaly/{session_id}")
async def get_anomaly(session_id: str, use_cleaned: bool = Query(default=True)):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")
    store = DATA_STORE[session_id]
    df = store["cleaned"] if (use_cleaned and store.get("cleaned") is not None) else store["original"]
    try:
        result = detect_anomalies(df)
        DATA_STORE[session_id]["anomaly_result"] = result
        return JSONResponse(content=result, headers=CORS)
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)}, headers=CORS)
