import traceback
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from routes.upload import DATA_STORE
from services.xai import compute_shap_explanations

router = APIRouter()

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

@router.get("/xai/{session_id}")
async def get_xai(session_id: str):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    store = DATA_STORE[session_id]
    if "model_result" not in store or store["model_result"] is None:
        raise HTTPException(
            status_code=400,
            detail="No trained model found. Please train a model first."
        )

    model_result = store["model_result"]
    try:
        xai_result = compute_shap_explanations(model_result)
        return JSONResponse(content=xai_result, headers=CORS_HEADERS)
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[XAI ERROR]\n{tb}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"XAI computation failed: {str(e)}"},
            headers=CORS_HEADERS,
        )
