"""
Anomaly Detection Service
Uses Isolation Forest + IQR + Z-Score to flag anomalies per row and column.
"""
import numpy as np
import pandas as pd
from typing import Any, Dict, List
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def detect_anomalies(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if not numeric_cols:
        return {"error": "No numeric columns found for anomaly detection."}

    df_num = df[numeric_cols].copy()
    n_rows = len(df_num)

    # ── 1. Isolation Forest (global) ───────────────────────────────────────
    df_filled = df_num.fillna(df_num.median())
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_filled)

    n_est = min(100, max(10, n_rows // 10))
    iso = IsolationForest(n_estimators=n_est, contamination=0.05, random_state=42, n_jobs=-1)
    iso_labels = iso.fit_predict(X_scaled)          # -1 = anomaly, 1 = normal
    iso_scores = iso.decision_function(X_scaled)    # lower = more anomalous

    anomaly_flags = (iso_labels == -1)
    anomaly_indices = [int(i) for i in np.where(anomaly_flags)[0]]
    anomaly_scores = [-round(float(s), 4) for s in iso_scores]   # flip: higher = worse

    # ── 2. IQR per column ─────────────────────────────────────────────────
    iqr_flags = pd.DataFrame(False, index=df.index, columns=numeric_cols)
    col_anomaly_summary: List[Dict] = []
    for col in numeric_cols:
        series = df_num[col].dropna()
        if len(series) < 4:
            continue
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        lb, ub = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        mask = (df_num[col] < lb) | (df_num[col] > ub)
        iqr_flags[col] = mask.fillna(False)
        n_anom = int(mask.sum())
        if n_anom > 0:
            col_anomaly_summary.append({
                "column": col,
                "count": n_anom,
                "pct": round(n_anom / n_rows * 100, 2),
                "lower_bound": round(float(lb), 4),
                "upper_bound": round(float(ub), 4),
                "min_anomaly": round(float(df_num[col][mask].min()), 4) if mask.any() else None,
                "max_anomaly": round(float(df_num[col][mask].max()), 4) if mask.any() else None,
            })

    any_iqr_flag = iqr_flags.any(axis=1)
    iqr_anomaly_rows = [int(i) for i in np.where(any_iqr_flag)[0]]

    # ── 3. Z-Score per column (|z| > 3) ───────────────────────────────────
    z_flags = pd.DataFrame(False, index=df.index, columns=numeric_cols)
    for col in numeric_cols:
        series = df_num[col].dropna()
        if len(series) < 5:
            continue
        mean, std = series.mean(), series.std()
        if std == 0:
            continue
        z = (df_num[col] - mean) / std
        z_flags[col] = (z.abs() > 3).fillna(False)

    # ── 4. Anomaly score chart data ────────────────────────────────────────
    sample_size = min(500, n_rows)
    sample_idx = list(range(sample_size))
    score_chart = {
        "id": "anomaly_scores",
        "type": "scatter",
        "title": "Isolation Forest Anomaly Scores",
        "data": [
            {
                "type": "scatter",
                "x": sample_idx,
                "y": [anomaly_scores[i] for i in sample_idx],
                "mode": "markers",
                "marker": {
                    "color": ["#ef4444" if anomaly_flags[i] else "#6366f1" for i in sample_idx],
                    "size": [7 if anomaly_flags[i] else 4 for i in sample_idx],
                    "opacity": 0.8,
                },
                "name": "Anomaly Score",
                "text": [f"Row {i}: {'ANOMALY' if anomaly_flags[i] else 'normal'}" for i in sample_idx],
            }
        ],
        "layout": {
            "title": "Anomaly Score per Row (red = anomaly)",
            "xaxis": {"title": "Row Index"},
            "yaxis": {"title": "Anomaly Score (higher = more anomalous)"},
            "template": "plotly_dark",
            "paper_bgcolor": "rgba(0,0,0,0)",
            "plot_bgcolor": "rgba(0,0,0,0)",
            "font": {"color": "#e2e8f0"},
        },
    }

    # Column anomaly bar chart
    if col_anomaly_summary:
        col_chart = {
            "id": "col_anomaly_bar",
            "type": "bar",
            "title": "Anomalies per Column (IQR)",
            "data": [{
                "type": "bar",
                "x": [c["column"] for c in col_anomaly_summary],
                "y": [c["pct"] for c in col_anomaly_summary],
                "marker": {"color": "#f59e0b", "opacity": 0.9},
                "name": "Anomaly %",
            }],
            "layout": {
                "title": "Anomaly % per Column (IQR Method)",
                "xaxis": {"title": "Column", "tickangle": -30},
                "yaxis": {"title": "Anomaly %"},
                "template": "plotly_dark",
                "paper_bgcolor": "rgba(0,0,0,0)",
                "plot_bgcolor": "rgba(0,0,0,0)",
                "font": {"color": "#e2e8f0"},
            },
        }
    else:
        col_chart = None

    # ── 5. Sample anomalous rows ───────────────────────────────────────────
    sample_anomalies = []
    for idx in anomaly_indices[:20]:
        row = df.iloc[idx].fillna("").astype(str).to_dict()
        row["_anomaly_score"] = anomaly_scores[idx]
        row["_row_index"] = idx
        sample_anomalies.append(row)

    return {
        "total_rows": n_rows,
        "iso_forest_anomalies": len(anomaly_indices),
        "iso_forest_anomaly_pct": round(len(anomaly_indices) / n_rows * 100, 2),
        "iqr_anomaly_rows": len(iqr_anomaly_rows),
        "iqr_anomaly_row_pct": round(len(iqr_anomaly_rows) / n_rows * 100, 2),
        "column_anomaly_summary": col_anomaly_summary,
        "anomaly_row_indices": anomaly_indices[:100],
        "sample_anomalous_rows": sample_anomalies,
        "charts": [c for c in [score_chart, col_chart] if c],
    }
