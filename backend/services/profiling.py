"""
Deep Statistical Profiling Service
Beyond basic describe() — distributions, correlations, pattern detection.
"""
import numpy as np
import pandas as pd
from typing import Any, Dict, List, Optional
from scipy import stats


def _sf(val) -> Optional[float]:
    try:
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 4)
    except Exception:
        return None


def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(exclude="number").columns.tolist()

    # ── Global overview ────────────────────────────────────────────────────
    overview = {
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "numeric_cols": len(numeric_cols),
        "categorical_cols": len(categorical_cols),
        "total_cells": int(len(df) * len(df.columns)),
        "missing_cells": int(df.isnull().sum().sum()),
        "missing_pct": round(df.isnull().mean().mean() * 100, 2),
        "duplicate_rows": int(df.duplicated().sum()),
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 3),
    }

    # ── Per-column deep stats ─────────────────────────────────────────────
    columns: Dict[str, Dict] = {}
    for col in df.columns:
        series = df[col]
        non_null = series.dropna()
        stat: Dict[str, Any] = {
            "dtype": str(series.dtype),
            "count": int(len(non_null)),
            "missing": int(series.isnull().sum()),
            "missing_pct": round(series.isnull().mean() * 100, 2),
            "unique": int(series.nunique()),
            "unique_pct": round(series.nunique() / max(len(df), 1) * 100, 2),
        }
        if col in numeric_cols:
            stat.update(_numeric_profile(series, non_null))
        else:
            stat.update(_categorical_profile(series, non_null))
        columns[col] = stat

    # ── Correlation matrix (numeric) ──────────────────────────────────────
    corr_data = None
    high_corr_pairs = []
    if len(numeric_cols) >= 2:
        corr_df = df[numeric_cols].corr()
        corr_arr = corr_df.to_numpy(copy=True, dtype=float)
        corr_data = {
            "columns": numeric_cols,
            "matrix": [
                [None if (np.isnan(v) or np.isinf(v)) else round(float(v), 4) for v in row]
                for row in corr_arr
            ],
        }
        checked = set()
        for i, c1 in enumerate(numeric_cols):
            for j, c2 in enumerate(numeric_cols):
                if i >= j or (c2, c1) in checked:
                    continue
                checked.add((c1, c2))
                val = corr_df.loc[c1, c2]
                if pd.notna(val) and abs(float(val)) > 0.7:
                    high_corr_pairs.append({
                        "col1": c1, "col2": c2,
                        "correlation": round(float(val), 4),
                        "strength": "very strong" if abs(val) > 0.9 else "strong",
                    })
        high_corr_pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)

    # ── Plotly charts for profiling ────────────────────────────────────────
    charts = []

    # Distribution shape chart (skewness per column)
    if numeric_cols:
        skews = []
        for col in numeric_cols:
            try:
                skews.append(round(float(df[col].skew()), 3))
            except Exception:
                skews.append(0.0)
        charts.append({
            "id": "skewness_bar",
            "title": "Skewness per Numeric Column",
            "data": [{
                "type": "bar",
                "x": numeric_cols,
                "y": skews,
                "marker": {
                    "color": ["#ef4444" if abs(s) > 2 else "#f59e0b" if abs(s) > 1 else "#10b981" for s in skews]
                },
                "name": "Skewness",
            }],
            "layout": {
                "title": "Skewness per Numeric Column",
                "xaxis": {"title": "Column", "tickangle": -30},
                "yaxis": {"title": "Skewness"},
                "shapes": [
                    {"type": "line", "x0": -0.5, "x1": len(numeric_cols)-0.5, "y0": 1,  "y1": 1,  "line": {"color": "#f59e0b", "dash": "dot", "width": 1}},
                    {"type": "line", "x0": -0.5, "x1": len(numeric_cols)-0.5, "y0": -1, "y1": -1, "line": {"color": "#f59e0b", "dash": "dot", "width": 1}},
                ],
                "template": "plotly_dark", "paper_bgcolor": "rgba(0,0,0,0)",
                "plot_bgcolor": "rgba(0,0,0,0)", "font": {"color": "#e2e8f0"},
            },
        })

    # Missing heatmap
    if df.isnull().any().any():
        sample = df.isnull().astype(int).head(100)
        charts.append({
            "id": "missing_heatmap",
            "title": "Missing Value Pattern (first 100 rows)",
            "data": [{
                "type": "heatmap",
                "z": sample.values.tolist(),
                "x": sample.columns.tolist(),
                "y": list(range(len(sample))),
                "colorscale": [[0, "#1c2030"], [1, "#ef4444"]],
                "showscale": False,
            }],
            "layout": {
                "title": "Missing Value Pattern (red = missing)",
                "xaxis": {"title": "Column", "tickangle": -30},
                "yaxis": {"title": "Row"},
                "template": "plotly_dark", "paper_bgcolor": "rgba(0,0,0,0)",
                "plot_bgcolor": "rgba(0,0,0,0)", "font": {"color": "#e2e8f0"},
            },
        })

    return {
        "overview": overview,
        "columns": columns,
        "correlation": corr_data,
        "high_correlation_pairs": high_corr_pairs,
        "charts": charts,
    }


def _numeric_profile(series: pd.Series, non_null: pd.Series) -> Dict[str, Any]:
    if len(non_null) == 0:
        return {}
    try:
        shapiro_p = None
        if 4 < len(non_null) <= 5000:
            _, p = stats.shapiro(non_null.sample(min(500, len(non_null)), random_state=42))
            shapiro_p = round(float(p), 6)
    except Exception:
        shapiro_p = None

    q1 = non_null.quantile(0.25)
    q3 = non_null.quantile(0.75)
    iqr = q3 - q1
    lb  = q1 - 1.5 * iqr
    ub  = q3 + 1.5 * iqr
    outliers = int(((non_null < lb) | (non_null > ub)).sum())

    return {
        "mean":     _sf(non_null.mean()),
        "std":      _sf(non_null.std()),
        "variance": _sf(non_null.var()),
        "min":      _sf(non_null.min()),
        "max":      _sf(non_null.max()),
        "range":    _sf(float(non_null.max()) - float(non_null.min())),
        "q1":       _sf(q1),
        "median":   _sf(non_null.median()),
        "q3":       _sf(q3),
        "iqr":      _sf(iqr),
        "skewness": _sf(non_null.skew()),
        "kurtosis": _sf(non_null.kurtosis()),
        "cv":       _sf(non_null.std() / non_null.mean() if non_null.mean() != 0 else None),
        "outliers": outliers,
        "outlier_pct": round(outliers / len(non_null) * 100, 2) if len(non_null) > 0 else 0,
        "normality_p_value": shapiro_p,
        "is_normal": (shapiro_p > 0.05) if shapiro_p is not None else None,
        "zeros": int((non_null == 0).sum()),
        "negatives": int((non_null < 0).sum()),
        "histogram": {
            "values": non_null.tolist()[:2000],
        },
    }


def _categorical_profile(series: pd.Series, non_null: pd.Series) -> Dict[str, Any]:
    vc = non_null.value_counts()
    entropy = float(stats.entropy(vc.values)) if len(vc) > 0 else 0.0
    return {
        "top_5": {str(k): int(v) for k, v in vc.head(5).items()},
        "top_value": str(vc.index[0]) if len(vc) > 0 else None,
        "top_freq": int(vc.iloc[0]) if len(vc) > 0 else 0,
        "top_freq_pct": round(float(vc.iloc[0]) / max(len(non_null), 1) * 100, 2) if len(vc) > 0 else 0,
        "entropy": round(entropy, 4),
        "is_binary": len(vc) == 2,
        "value_counts": {str(k): int(v) for k, v in vc.head(20).items()},
    }
