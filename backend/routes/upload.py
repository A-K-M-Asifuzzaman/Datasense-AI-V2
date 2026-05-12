import os
import uuid
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import io

router = APIRouter()

# In-memory store (for production use Redis/DB)
DATA_STORE = {}

def get_store():
    return DATA_STORE

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV has no data rows.")

    if len(df) > 100000:
        df = df.head(100000)

    session_id = str(uuid.uuid4())
    DATA_STORE[session_id] = {
        "original": df,
        "cleaned": None,
        "filename": file.filename
    }

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(exclude="number").columns.tolist()

    return JSONResponse(content={
        "session_id": session_id,
        "filename": file.filename,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_names": df.columns.tolist(),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "preview": df.head(10).fillna("").astype(str).to_dict(orient="records")
    })

@router.get("/session/{session_id}")
async def get_session_info(session_id: str):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")
    df = DATA_STORE[session_id]["original"]
    return {
        "session_id": session_id,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": df.columns.tolist()
    }
