"""AutoML leaderboard route — trains 8+ models in parallel."""
import traceback
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from routes.upload import DATA_STORE
from services.automl import run_automl

router = APIRouter()
CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"}


class AutoMLConfig(BaseModel):
    session_id: str
    target_column: str
    use_cleaned: Optional[bool] = True
    model_type: Optional[str] = "auto"
    test_size: Optional[float] = 0.2


@router.post("/automl/train")
async def automl_train(cfg: AutoMLConfig):
    if cfg.session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")
    store = DATA_STORE[cfg.session_id]
    df = store["cleaned"] if (cfg.use_cleaned and store.get("cleaned") is not None) else store["original"]
    if cfg.target_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{cfg.target_column}' not found.")
    try:
        result = run_automl(df, cfg.target_column, cfg.model_type, cfg.test_size)
        # store best model for XAI
        if result.get("best_model_result"):
            DATA_STORE[cfg.session_id]["model_result"] = result["best_model_result"]
            DATA_STORE[cfg.session_id]["automl_result"] = result
        # strip non-serialisable
        safe = {k: v for k, v in result.items() if k != "best_model_result"}
        return JSONResponse(content=safe, headers=CORS)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e)}, headers=CORS)


@router.get("/automl/result/{session_id}")
async def automl_result(session_id: str):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")
    ar = DATA_STORE[session_id].get("automl_result")
    if not ar:
        raise HTTPException(status_code=404, detail="No AutoML result found. Run /automl/train first.")
    safe = {k: v for k, v in ar.items() if k != "best_model_result"}
    return JSONResponse(content=safe, headers=CORS)
