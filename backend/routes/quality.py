from fastapi import APIRouter, HTTPException
from routes.upload import DATA_STORE
from services.data_quality import compute_quality_report

router = APIRouter()

@router.get("/quality/{session_id}")
async def get_quality(session_id: str):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    df = DATA_STORE[session_id]["original"]
    report = compute_quality_report(df)
    return report

@router.get("/quality/{session_id}/suggestions")
async def get_cleaning_suggestions(session_id: str):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    df = DATA_STORE[session_id]["original"]
    from services.cleaning import generate_suggestions
    suggestions = generate_suggestions(df)
    return {"suggestions": suggestions}
