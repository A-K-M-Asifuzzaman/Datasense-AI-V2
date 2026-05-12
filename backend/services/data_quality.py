"""
Data quality scoring — pandas 3.x compatible.
"""
import pandas as pd
import numpy as np
from typing import Any, Dict, Optional


def compute_quality_report(df: pd.DataFrame) -> Dict[str, Any]:
    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols

    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    # ── Missing values ─────────────────────────────────────────────────────
    missing_per_col = df.isnull().sum()
    total_missing = int(missing_per_col.sum())
    completeness = round((1 - total_missing / total_cells) * 100, 2) if total_cells else 100.0

    missing_details: Dict[str, Dict] = {}
    for col in df.columns:
        count = int(missing_per_col[col])
        pct = round(count / total_rows * 100, 2) if total_rows else 0.0
        missing_details[col] = {"count": count, "percentage": pct}

    # ── Duplicates ─────────────────────────────────────────────────────────
    duplicate_count = int(df.duplicated().sum())
    uniqueness = round((1 - duplicate_count / total_rows) * 100, 2) if total_rows else 100.0

    # ── Outliers (IQR) ─────────────────────────────────────────────────────
    outlier_counts: Dict[str, int] = {}
    total_outliers = 0
    numeric_total = 0
    for col in numeric_cols:
        series = df[col].dropna()
        n = len(series)
        numeric_total += n
        if n < 4:
            outlier_counts[col] = 0
            continue
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            outlier_counts[col] = 0
            continue
        count = int(((series < q1 - 1.5 * iqr) | (series > q3 + 1.5 * iqr)).sum())
        outlier_counts[col] = count
        total_outliers += count

    outlier_score = round((1 - total_outliers / max(numeric_total, 1)) * 100, 2)

    # ── Validity ───────────────────────────────────────────────────────────
    validity = _compute_validity(df)

    # ── Overall score (weighted) ───────────────────────────────────────────
    overall_score = round(
        completeness * 0.35
        + uniqueness * 0.25
        + outlier_score * 0.25
        + validity * 0.15,
        2,
    )

    # ── Per-column stats ───────────────────────────────────────────────────
    column_stats: Dict[str, Dict] = {}
    for col in df.columns:
        stat: Dict[str, Any] = {
            "dtype": str(df[col].dtype),
            "missing_count": int(df[col].isnull().sum()),
            "missing_pct": round(df[col].isnull().mean() * 100, 2),
            "unique_count": int(df[col].nunique()),
        }
        if col in numeric_cols:
            desc = df[col].describe()
            stat.update({
                "mean":     _sf(desc.get("mean")),
                "std":      _sf(desc.get("std")),
                "min":      _sf(desc.get("min")),
                "max":      _sf(desc.get("max")),
                "q25":      _sf(desc.get("25%")),
                "median":   _sf(desc.get("50%")),
                "q75":      _sf(desc.get("75%")),
                "outlier_count": outlier_counts.get(col, 0),
                "skewness":  _sf(df[col].skew()),
                "kurtosis":  _sf(df[col].kurtosis()),
            })
        else:
            mode_series = df[col].mode()
            top_val = str(mode_series.iloc[0]) if not mode_series.empty else None
            stat["top_value"] = top_val
        column_stats[col] = stat

    return {
        "overall_score":    overall_score,
        "completeness":     completeness,
        "uniqueness":       uniqueness,
        "outlier_score":    outlier_score,
        "validity":         validity,
        "total_rows":       total_rows,
        "total_columns":    total_cols,
        "total_missing":    total_missing,
        "total_duplicates": duplicate_count,
        "total_outliers":   total_outliers,
        "missing_details":  missing_details,
        "outlier_counts":   outlier_counts,
        "column_stats":     column_stats,
    }


def _compute_validity(df: pd.DataFrame) -> float:
    issues = 0.0
    total = len(df.columns)
    if total == 0:
        return 100.0
    for col in df.select_dtypes(include="object").columns:
        non_null = df[col].dropna()
        if non_null.empty:
            continue
        converted = pd.to_numeric(non_null, errors="coerce")
        if converted.notna().mean() > 0.5:
            issues += 0.5    # column looks numeric but stored as string
    return round(max(0.0, (1 - issues / total)) * 100, 2)


def _sf(val: Any) -> Optional[float]:
    """Safe float — returns None for NaN/Inf."""
    try:
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 4)
    except Exception:
        return None
