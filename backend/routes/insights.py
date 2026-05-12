from fastapi import APIRouter, HTTPException, Query
from routes.upload import DATA_STORE
from services.insights import generate_insights

router = APIRouter()

@router.get("/insights/{session_id}")
async def get_insights(session_id: str, use_cleaned: bool = Query(default=True)):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    store = DATA_STORE[session_id]
    if use_cleaned and store.get("cleaned") is not None:
        df = store["cleaned"]
        data_source = "cleaned"
    else:
        df = store["original"]
        data_source = "original"

    insights = generate_insights(df)
    return {"session_id": session_id, "data_source": data_source, "insights": insights}
