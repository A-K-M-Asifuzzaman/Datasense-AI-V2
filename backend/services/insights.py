"""
Automated insight engine — pandas 3.x compatible.
"""
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional


def generate_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
    insights: List[Dict[str, Any]] = []
    numeric_cols  = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(exclude="number").columns.tolist()

    # ── 1. Skewness ────────────────────────────────────────────────────────
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 5:
            continue
        try:
            skew = float(series.skew())
        except Exception:
            continue
        abs_skew = abs(skew)
        if abs_skew > 2:
            direction = "right (positive)" if skew > 0 else "left (negative)"
            insights.append({
                "type": "skewness",
                "severity": "high" if abs_skew > 3 else "medium",
                "column": col,
                "value": round(skew, 4),
                "title": f"High Skewness in '{col}'",
                "description": (
                    f"Column '{col}' is heavily skewed {direction} (skewness={skew:.2f}). "
                    "Consider log transformation or normalization before ML training."
                ),
                "icon": "⚠️",
            })
        elif abs_skew > 1:
            direction = "right" if skew > 0 else "left"
            insights.append({
                "type": "skewness",
                "severity": "low",
                "column": col,
                "value": round(skew, 4),
                "title": f"Moderate Skewness in '{col}'",
                "description": f"Column '{col}' has moderate {direction} skew (skewness={skew:.2f}).",
                "icon": "ℹ️",
            })

    # ── 2. Strong correlations ─────────────────────────────────────────────
    if len(numeric_cols) >= 2:
        corr_df = df[numeric_cols].corr()
        checked: set = set()
        for c1 in numeric_cols:
            for c2 in numeric_cols:
                if c1 == c2 or (c2, c1) in checked:
                    continue
                checked.add((c1, c2))
                corr_val = corr_df.loc[c1, c2]
                if pd.isna(corr_val):
                    continue
                abs_corr = abs(float(corr_val))
                if abs_corr > 0.8:
                    direction = "positive" if corr_val > 0 else "negative"
                    insights.append({
                        "type": "correlation",
                        "severity": "high" if abs_corr > 0.9 else "medium",
                        "column": f"{c1} & {c2}",
                        "value": round(float(corr_val), 4),
                        "title": f"Strong Correlation: '{c1}' ↔ '{c2}'",
                        "description": (
                            f"Strong {direction} correlation ({corr_val:.3f}) between '{c1}' "
                            f"and '{c2}'. Watch out for multicollinearity in ML models."
                        ),
                        "icon": "🔗",
                    })

    # ── 3. Class imbalance ─────────────────────────────────────────────────
    for col in categorical_cols:
        vc = df[col].value_counts(normalize=True)
        if len(vc) < 2 or len(vc) > 20:
            continue
        max_ratio = float(vc.iloc[0])
        if max_ratio > 0.8:
            insights.append({
                "type": "imbalance",
                "severity": "high",
                "column": col,
                "value": round(max_ratio * 100, 2),
                "title": f"Class Imbalance in '{col}'",
                "description": (
                    f"Column '{col}' is highly imbalanced: '{vc.index[0]}' = "
                    f"{max_ratio*100:.1f}%. Consider over/undersampling for ML tasks."
                ),
                "icon": "⚖️",
            })

    # ── 4. Near-zero variance ──────────────────────────────────────────────
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 5:
            continue
        std  = float(series.std())
        mean = abs(float(series.mean()))
        cv   = std / mean if mean != 0 else 0.0
        if cv < 0.01 and std < 0.001:
            insights.append({
                "type": "low_variance",
                "severity": "low",
                "column": col,
                "value": round(std, 6),
                "title": f"Near-Zero Variance in '{col}'",
                "description": (
                    f"Column '{col}' has very low variance (std={std:.6f}). "
                    "It may not contribute useful signal to ML models."
                ),
                "icon": "📉",
            })

    # ── 5. High cardinality ────────────────────────────────────────────────
    n_rows = len(df)
    for col in categorical_cols:
        n_unique = int(df[col].nunique())
        if n_rows > 50 and n_unique > 0.5 * n_rows:
            insights.append({
                "type": "high_cardinality",
                "severity": "medium",
                "column": col,
                "value": n_unique,
                "title": f"High Cardinality in '{col}'",
                "description": (
                    f"Column '{col}' has {n_unique} unique values "
                    f"({n_unique/n_rows*100:.1f}% of rows). "
                    "Use target-encoding or hash-encoding carefully."
                ),
                "icon": "🔢",
            })

    # ── 6. Constant columns ────────────────────────────────────────────────
    for col in df.columns:
        if df[col].nunique() <= 1:
            insights.append({
                "type": "constant_column",
                "severity": "medium",
                "column": col,
                "value": int(df[col].nunique()),
                "title": f"Constant Column: '{col}'",
                "description": (
                    f"Column '{col}' has only {df[col].nunique()} unique value(s). "
                    "Drop it before ML training — it carries no predictive information."
                ),
                "icon": "🚫",
            })

    # ── 7. Summary ─────────────────────────────────────────────────────────
    insights.append({
        "type": "summary",
        "severity": "info",
        "column": None,
        "value": None,
        "title": "Dataset Overview",
        "description": (
            f"Dataset has {n_rows:,} rows × {len(df.columns)} columns. "
            f"{len(numeric_cols)} numeric, {len(categorical_cols)} categorical. "
            f"Total missing cells: {int(df.isnull().sum().sum())}."
        ),
        "icon": "📊",
    })

    return insights
