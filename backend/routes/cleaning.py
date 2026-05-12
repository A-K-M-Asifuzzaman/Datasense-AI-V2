from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from routes.upload import DATA_STORE
from services.cleaning import apply_cleaning

router = APIRouter()

class CleaningConfig(BaseModel):
    session_id: str
    handle_missing: Optional[str] = "auto"   # auto | mean | median | mode | drop
    remove_duplicates: Optional[bool] = True
    handle_outliers: Optional[bool] = True
    outlier_method: Optional[str] = "iqr"    # iqr | zscore
    custom_column_strategies: Optional[Dict[str, str]] = {}

@router.post("/clean")
async def clean_data(config: CleaningConfig):
    session_id = config.session_id
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    df_original = DATA_STORE[session_id]["original"]
    cleaned_df, cleaning_log = apply_cleaning(df_original, config.dict())

    DATA_STORE[session_id]["cleaned"] = cleaned_df

    return {
        "session_id": session_id,
        "original_rows": len(df_original),
        "cleaned_rows": len(cleaned_df),
        "rows_removed": len(df_original) - len(cleaned_df),
        "cleaning_log": cleaning_log,
        "preview": cleaned_df.head(10).fillna("").astype(str).to_dict(orient="records")
    }
