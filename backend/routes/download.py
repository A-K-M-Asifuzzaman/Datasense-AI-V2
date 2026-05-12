"""Download routes — CSV, JSON report, and PDF report."""
import io
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse, Response
from routes.upload import DATA_STORE

router = APIRouter()
CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"}


def _sanitize(obj):
    if isinstance(obj, dict):   return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):   return [_sanitize(v) for v in obj]
    if isinstance(obj, (np.integer,)):  return int(obj)
    if isinstance(obj, (np.floating,)):
        f = float(obj)
        return None if (np.isnan(f) or np.isinf(f)) else f
    if isinstance(obj, np.ndarray): return _sanitize(obj.tolist())
    if isinstance(obj, pd.DataFrame): return _sanitize(obj.to_dict(orient="records"))
    if isinstance(obj, pd.Series):    return _sanitize(obj.tolist())
    return obj


@router.get("/download/{session_id}/csv")
async def download_csv(session_id: str):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")
    store = DATA_STORE[session_id]
    df = store["cleaned"] if store.get("cleaned") is not None else store["original"]
    fname = store.get("filename", "data.csv").replace(".csv", "_cleaned.csv")
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]), media_type="text/csv",
        headers={**CORS, "Content-Disposition": f"attachment; filename={fname}"},
    )


@router.get("/download/{session_id}/report")
async def download_json_report(session_id: str):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")
    store = DATA_STORE[session_id]
    from services.data_quality import compute_quality_report
    from services.insights import generate_insights
    report = {
        "session_id": session_id,
        "filename":   store.get("filename", "unknown"),
        "original_shape": {"rows": int(len(store["original"])), "columns": int(len(store["original"].columns))},
        "quality_report": compute_quality_report(store["original"]),
        "insights":       generate_insights(store["original"]),
    }
    if store.get("cleaned") is not None:
        report["cleaned_shape"] = {"rows": int(len(store["cleaned"])), "columns": int(len(store["cleaned"].columns))}
    mr = store.get("model_result")
    if mr:
        SKIP = {"model", "X_test", "y_test", "X_train"}
        report["model_results"] = {k: v for k, v in mr.items() if k not in SKIP}
    ar = store.get("automl_result")
    if ar:
        report["automl_leaderboard"] = {k: v for k, v in ar.items() if k != "best_model_result"}
    anomaly = store.get("anomaly_result")
    if anomaly:
        report["anomaly_summary"] = {
            k: v for k, v in anomaly.items() if k not in ("charts", "sample_anomalous_rows")
        }
    return JSONResponse(
        content=_sanitize(report),
        headers={**CORS, "Content-Disposition": "attachment; filename=datasense_report.json"},
    )


@router.get("/download/{session_id}/pdf")
async def download_pdf_report(session_id: str):
    if session_id not in DATA_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")
    store = DATA_STORE[session_id]
    from services.data_quality import compute_quality_report
    from services.insights import generate_insights
    from services.report_pdf import generate_pdf_report

    quality = _sanitize(compute_quality_report(store["original"]))
    insights = _sanitize(generate_insights(store["original"]))
    mr = store.get("model_result")
    model_result = _sanitize({k: v for k, v in mr.items() if k not in {"model","X_test","y_test","X_train"}}) if mr else None
    ar = store.get("automl_result")
    automl_result = _sanitize({k: v for k, v in ar.items() if k != "best_model_result"}) if ar else None
    anomaly_result = _sanitize(store.get("anomaly_result")) if store.get("anomaly_result") else None

    try:
        pdf_bytes = generate_pdf_report(
            session_id=session_id,
            filename=store.get("filename", "unknown"),
            quality=quality,
            insights=insights,
            model_result=model_result,
            automl_result=automl_result,
            anomaly_result=anomaly_result,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={**CORS, "Content-Disposition": f"attachment; filename=datasense_report_{session_id[:8]}.pdf"},
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"PDF generation failed: {e}"}, headers=CORS)
