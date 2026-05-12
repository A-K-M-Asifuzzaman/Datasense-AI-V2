import pandas as pd
import numpy as np
from typing import List, Dict, Any


def generate_eda_charts(df: pd.DataFrame) -> List[Dict[str, Any]]:
    charts = []
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(exclude="number").columns.tolist()

    if not numeric_cols:
        return charts

    # ── 1. Histograms ──────────────────────────────────────────────────────
    for col in numeric_cols[:6]:
        series = df[col].dropna()
        if series.empty:
            continue
        charts.append({
            "id": f"hist_{col}",
            "type": "histogram",
            "title": f"Distribution of {col}",
            "data": [{
                "type": "histogram",
                "x": series.tolist(),
                "name": col,
                "marker": {"color": "#6366f1", "opacity": 0.8},
                "nbinsx": min(30, max(10, len(series) // 20))
            }],
            "layout": _base_layout(f"Distribution of {col}", col, "Count"),
        })

    # ── 2. Box plots ───────────────────────────────────────────────────────
    box_data = []
    for col in numeric_cols[:8]:
        series = df[col].dropna()
        if series.empty:
            continue
        box_data.append({
            "type": "box",
            "y": series.tolist(),
            "name": col,
            "boxpoints": "outliers",
            "marker": {"size": 4},
        })
    if box_data:
        charts.append({
            "id": "box_plots",
            "type": "box",
            "title": "Box Plots – Numeric Columns",
            "data": box_data,
            "layout": {**_base_layout("Box Plots – All Numeric Columns", "", "Value"), "showlegend": True},
        })

    # ── 3. Correlation heatmap ─────────────────────────────────────────────
    if len(numeric_cols) >= 2:
        corr_df = df[numeric_cols].corr()
        cols_list = corr_df.columns.tolist()

        # copy to writable array before fill_diagonal
        corr_arr = corr_df.to_numpy(copy=True, dtype=float)
        z_values = [
            [None if (np.isnan(v) or np.isinf(v)) else round(float(v), 4) for v in row]
            for row in corr_arr
        ]
        charts.append({
            "id": "correlation_heatmap",
            "type": "heatmap",
            "title": "Correlation Heatmap",
            "data": [{
                "type": "heatmap",
                "z": z_values,
                "x": cols_list,
                "y": cols_list,
                "colorscale": "RdBu",
                "zmid": 0,
                "text": z_values,
                "texttemplate": "%{text:.2f}",
                "hoverongaps": False,
            }],
            "layout": {
                **_base_layout("Feature Correlation Heatmap"),
                "xaxis": {"tickangle": -45},
            },
        })

    # ── 4. Scatter (most-correlated pair) ──────────────────────────────────
    if len(numeric_cols) >= 2:
        corr_df2 = df[numeric_cols].corr()
        corr_arr2 = corr_df2.to_numpy(copy=True, dtype=float)
        np.fill_diagonal(corr_arr2, 0)          # safe on our own copy
        flat_idx = int(np.argmax(np.abs(np.nan_to_num(corr_arr2))))
        n = len(numeric_cols)
        ri, ci = divmod(flat_idx, n)
        col_x, col_y = numeric_cols[ri], numeric_cols[ci]

        charts.append({
            "id": f"scatter_{col_x}_{col_y}",
            "type": "scatter",
            "title": f"Scatter: {col_x} vs {col_y}",
            "data": [{
                "type": "scatter",
                "x": df[col_x].dropna().head(2000).tolist(),
                "y": df[col_y].dropna().head(2000).tolist(),
                "mode": "markers",
                "marker": {"color": "#10b981", "opacity": 0.6, "size": 5},
                "name": f"{col_x} vs {col_y}",
            }],
            "layout": _base_layout(f"Scatter: {col_x} vs {col_y}", col_x, col_y),
        })

    # ── 5. Missing values bar ──────────────────────────────────────────────
    missing = df.isnull().sum()
    missing = missing[missing > 0]
    if not missing.empty:
        charts.append({
            "id": "missing_values_bar",
            "type": "bar",
            "title": "Missing Values per Column",
            "data": [{
                "type": "bar",
                "x": missing.index.tolist(),
                "y": missing.tolist(),
                "marker": {"color": "#f59e0b"},
                "name": "Missing Count",
            }],
            "layout": _base_layout("Missing Values per Column", "Column", "Missing Count"),
        })

    # ── 6. Categorical bars (top 3 cols) ───────────────────────────────────
    for col in categorical_cols[:3]:
        vc = df[col].value_counts().head(15)
        if vc.empty:
            continue
        charts.append({
            "id": f"cat_bar_{col}",
            "type": "bar",
            "title": f"Value Distribution: {col}",
            "data": [{
                "type": "bar",
                "x": vc.index.tolist(),
                "y": vc.tolist(),
                "marker": {"color": "#8b5cf6"},
                "name": col,
            }],
            "layout": {
                **_base_layout(f"Value Distribution: {col}", col, "Count"),
                "xaxis": {"tickangle": -30},
            },
        })

    # ── 7. Data-type pie ───────────────────────────────────────────────────
    dtype_counts: Dict[str, int] = {}
    for dtype in df.dtypes:
        key = str(dtype)
        dtype_counts[key] = dtype_counts.get(key, 0) + 1

    charts.append({
        "id": "dtype_pie",
        "type": "pie",
        "title": "Column Data Types",
        "data": [{
            "type": "pie",
            "labels": list(dtype_counts.keys()),
            "values": list(dtype_counts.values()),
            "hole": 0.4,
            "marker": {"colors": ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]},
        }],
        "layout": _base_layout("Column Data Types"),
    })

    return charts


def _base_layout(title: str = "", x_title: str = "", y_title: str = "") -> Dict[str, Any]:
    layout: Dict[str, Any] = {
        "title": title,
        "template": "plotly_dark",
        "paper_bgcolor": "rgba(0,0,0,0)",
        "plot_bgcolor": "rgba(0,0,0,0)",
        "font": {"color": "#e2e8f0"},
        "margin": {"t": 50, "r": 20, "b": 60, "l": 60},
    }
    if x_title:
        layout["xaxis"] = {"title": x_title}
    if y_title:
        layout["yaxis"] = {"title": y_title}
    return layout
