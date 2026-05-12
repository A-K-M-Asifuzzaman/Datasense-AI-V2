from fastapi import APIRouter, HTTPException, Query
from routes.upload import DATA_STORE
from services.eda import generate_eda_charts

router = APIRouter()

@router.get("/eda/{session_id}")
async def get_eda(session_id: str, use_cleaned: bool = Query(default=True)):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    store = DATA_STORE[session_id]
    if use_cleaned and store.get("cleaned") is not None:
        df = store["cleaned"]
        data_source = "cleaned"
    else:
        df = store["original"]
        data_source = "original"

    charts = generate_eda_charts(df)
    return {"session_id": session_id, "data_source": data_source, "charts": charts}
