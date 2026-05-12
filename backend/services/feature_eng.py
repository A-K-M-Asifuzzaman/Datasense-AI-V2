"""
Feature Engineering Suggestions Service
Analyzes columns and recommends transformations, encodings, and new features.
"""
import numpy as np
import pandas as pd
from typing import Any, Dict, List


def suggest_features(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(exclude="number").columns.tolist()
    suggestions: List[Dict[str, Any]] = []
    auto_features: List[Dict[str, Any]] = []

    # ── Numeric transformations ────────────────────────────────────────────
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 5:
            continue
        skew = abs(float(series.skew()))
        has_neg = (series < 0).any()
        has_zero = (series == 0).any()

        if skew > 2 and not has_neg and not has_zero:
            suggestions.append({
                "type": "log_transform",
                "column": col,
                "priority": "high",
                "title": f"Log Transform '{col}'",
                "description": f"Skewness={skew:.2f}. Log transform will normalize distribution for ML.",
                "code": f"df['{col}_log'] = np.log1p(df['{col}'])",
            })
            auto_features.append({"name": f"{col}_log", "description": "Log-transformed"})

        if skew > 1 and not has_neg:
            suggestions.append({
                "type": "sqrt_transform",
                "column": col,
                "priority": "medium",
                "title": f"Square Root Transform '{col}'",
                "description": f"Mild skewness={skew:.2f}. Sqrt reduces skew while keeping zeros.",
                "code": f"df['{col}_sqrt'] = np.sqrt(df['{col}'].clip(0))",
            })

        # Binning (high cardinality)
        n_unique = series.nunique()
        if n_unique > 20:
            suggestions.append({
                "type": "binning",
                "column": col,
                "priority": "low",
                "title": f"Bin '{col}' into Quartiles",
                "description": f"{n_unique} unique values. Quartile binning reduces noise.",
                "code": f"df['{col}_bin'] = pd.qcut(df['{col}'], q=4, labels=False, duplicates='drop')",
            })

        # Z-score normalization
        suggestions.append({
            "type": "normalize",
            "column": col,
            "priority": "medium",
            "title": f"Standardize '{col}'",
            "description": "Z-score normalization for distance-based models (KNN, SVM).",
            "code": f"df['{col}_z'] = (df['{col}'] - df['{col}'].mean()) / df['{col}'].std()",
        })

    # ── Interaction features (top correlated pairs) ────────────────────────
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols].corr()
        checked = set()
        count = 0
        for c1 in numeric_cols:
            for c2 in numeric_cols:
                if c1 == c2 or (c2, c1) in checked or count >= 3:
                    continue
                checked.add((c1, c2))
                val = corr.loc[c1, c2]
                if pd.notna(val) and abs(float(val)) > 0.5:
                    suggestions.append({
                        "type": "interaction",
                        "column": f"{c1} × {c2}",
                        "priority": "medium",
                        "title": f"Interaction Feature: {c1} × {c2}",
                        "description": f"Correlation={val:.2f}. Multiplication captures joint effect.",
                        "code": f"df['{c1}_x_{c2}'] = df['{c1}'] * df['{c2}']",
                    })
                    auto_features.append({"name": f"{c1}_x_{c2}", "description": "Interaction feature"})
                    count += 1

    # ── Ratio features ─────────────────────────────────────────────────────
    if len(numeric_cols) >= 2:
        for i in range(min(2, len(numeric_cols))):
            c1, c2 = numeric_cols[i], numeric_cols[i + 1] if i + 1 < len(numeric_cols) else numeric_cols[0]
            if c1 == c2:
                continue
            suggestions.append({
                "type": "ratio",
                "column": f"{c1}/{c2}",
                "priority": "low",
                "title": f"Ratio Feature: {c1} / {c2}",
                "description": "Ratio captures relative magnitude and is scale-invariant.",
                "code": f"df['{c1}_per_{c2}'] = df['{c1}'] / (df['{c2}'] + 1e-9)",
            })

    # ── Categorical encodings ─────────────────────────────────────────────
    for col in categorical_cols:
        n_unique = df[col].nunique()
        if n_unique == 2:
            suggestions.append({
                "type": "binary_encode",
                "column": col,
                "priority": "high",
                "title": f"Binary Encode '{col}'",
                "description": "Only 2 unique values — simple 0/1 mapping is optimal.",
                "code": f"df['{col}_enc'] = (df['{col}'] == df['{col}'].mode()[0]).astype(int)",
            })
        elif n_unique <= 10:
            suggestions.append({
                "type": "onehot",
                "column": col,
                "priority": "high",
                "title": f"One-Hot Encode '{col}'",
                "description": f"{n_unique} categories — OHE is standard for low cardinality.",
                "code": f"df = pd.get_dummies(df, columns=['{col}'], prefix='{col}')",
            })
        elif n_unique <= 50:
            suggestions.append({
                "type": "target_encode",
                "column": col,
                "priority": "medium",
                "title": f"Target Encode '{col}'",
                "description": f"{n_unique} categories — target encoding prevents OHE explosion.",
                "code": f"# Use category_encoders.TargetEncoder for '{col}'",
            })
        else:
            suggestions.append({
                "type": "hash_encode",
                "column": col,
                "priority": "low",
                "title": f"Hash Encode '{col}'",
                "description": f"{n_unique} categories — hash encoding handles high cardinality.",
                "code": f"df['{col}_hash'] = df['{col}'].apply(lambda x: hash(str(x)) % 1000)",
            })

    # ── Date/time detection ────────────────────────────────────────────────
    for col in categorical_cols:
        sample = df[col].dropna().head(50).astype(str)
        try:
            parsed = pd.to_datetime(sample, errors="coerce", infer_datetime_format=True)
            if parsed.notna().mean() > 0.8:
                suggestions.append({
                    "type": "datetime_extract",
                    "column": col,
                    "priority": "high",
                    "title": f"Extract Datetime Features from '{col}'",
                    "description": "Column appears to contain dates. Extract year/month/day/weekday.",
                    "code": (
                        f"df['{col}'] = pd.to_datetime(df['{col}'])\n"
                        f"df['{col}_year']    = df['{col}'].dt.year\n"
                        f"df['{col}_month']   = df['{col}'].dt.month\n"
                        f"df['{col}_weekday'] = df['{col}'].dt.weekday"
                    ),
                })
        except Exception:
            pass

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda s: priority_order.get(s["priority"], 3))

    return {
        "total_suggestions": len(suggestions),
        "high_priority": len([s for s in suggestions if s["priority"] == "high"]),
        "suggestions": suggestions,
        "auto_features": auto_features,
    }
