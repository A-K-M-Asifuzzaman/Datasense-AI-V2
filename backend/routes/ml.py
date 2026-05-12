import traceback
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from routes.upload import DATA_STORE
from services.ml_model import train_model

router = APIRouter()

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

class TrainConfig(BaseModel):
    session_id: str
    target_column: str
    use_cleaned: Optional[bool] = True
    model_type: Optional[str] = "auto"   # auto | classification | regression
    test_size: Optional[float] = 0.2

@router.post("/train")
async def train(config: TrainConfig):
    session_id = config.session_id
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    store = DATA_STORE[session_id]
    if config.use_cleaned and store.get("cleaned") is not None:
        df = store["cleaned"]
    else:
        df = store["original"]

    if config.target_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{config.target_column}' not found. Available: {df.columns.tolist()}"
        )

    try:
        result = train_model(df, config.target_column, config.model_type, config.test_size)

        # Build a JSON-safe copy (exclude non-serializable objects)
        safe_result = {k: v for k, v in result.items()
                       if k not in ("model", "X_test", "y_test", "X_train")}

        # Store full result (with model) for XAI
        DATA_STORE[session_id]["model_result"] = result

        return JSONResponse(content=safe_result, headers=CORS_HEADERS)

    except Exception as e:
        tb = traceback.format_exc()
        print(f"[TRAIN ERROR]\n{tb}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Model training failed: {str(e)}"},
            headers=CORS_HEADERS,
        )
