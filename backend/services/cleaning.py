"""
Pandas 3.x-safe cleaning service.
All inplace=True on chained indexing replaced with direct assignment.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple


def generate_suggestions(df: pd.DataFrame) -> List[Dict[str, Any]]:
    suggestions = []
    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    # Missing value suggestions
    for col in df.columns:
        miss_pct = df[col].isnull().mean() * 100
        if miss_pct > 0:
            if col in numeric_cols:
                skew = abs(df[col].skew()) if not df[col].dropna().empty else 0
                strategy = "median" if skew > 1 else "mean"
            else:
                strategy = "mode"
            suggestions.append({
                "type": "missing_values",
                "column": col,
                "severity": "high" if miss_pct > 30 else ("medium" if miss_pct > 10 else "low"),
                "description": f"Column '{col}' has {miss_pct:.1f}% missing values.",
                "action": f"Fill with {strategy}",
                "strategy": strategy,
            })

    # Duplicates
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        suggestions.append({
            "type": "duplicates",
            "column": None,
            "severity": "medium",
            "description": f"Dataset has {dup_count} duplicate rows ({dup_count/len(df)*100:.1f}%).",
            "action": "Remove duplicate rows",
            "strategy": "drop_duplicates",
        })

    # Outliers
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 4:
            continue
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        outliers = int(((series < q1 - 1.5 * iqr) | (series > q3 + 1.5 * iqr)).sum())
        outlier_pct = outliers / len(series) * 100
        if outlier_pct > 1:
            suggestions.append({
                "type": "outliers",
                "column": col,
                "severity": "high" if outlier_pct > 10 else "medium",
                "description": f"Column '{col}' has {outliers} outliers ({outlier_pct:.1f}%).",
                "action": "Clip outliers using IQR method",
                "strategy": "iqr_clip",
            })

    return suggestions


def apply_cleaning(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, List[str]]:
    df = df.copy()
    log: List[str] = []

    handle_missing: str = config.get("handle_missing", "auto")
    remove_duplicates: bool = config.get("remove_duplicates", True)
    handle_outliers: bool = config.get("handle_outliers", True)
    outlier_method: str = config.get("outlier_method", "iqr")
    custom_strategies: Dict[str, str] = config.get("custom_column_strategies") or {}

    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    # ── Missing values ─────────────────────────────────────────────────────
    for col in df.columns:
        if df[col].isnull().sum() == 0:
            continue

        strategy = custom_strategies.get(col, handle_missing)

        if col in numeric_cols:
            if strategy == "auto":
                try:
                    skew = abs(df[col].skew())
                except Exception:
                    skew = 0
                strategy = "median" if skew > 1 else "mean"

            if strategy == "mean":
                val = df[col].mean()
                df[col] = df[col].fillna(val)
                log.append(f"Filled '{col}' missing values with mean ({val:.4f})")

            elif strategy == "median":
                val = df[col].median()
                df[col] = df[col].fillna(val)
                log.append(f"Filled '{col}' missing values with median ({val:.4f})")

            elif strategy == "mode":
                mode_vals = df[col].mode()
                val = mode_vals.iloc[0] if not mode_vals.empty else 0
                df[col] = df[col].fillna(val)
                log.append(f"Filled '{col}' missing values with mode ({val})")

            elif strategy == "drop":
                before = len(df)
                df = df.dropna(subset=[col]).reset_index(drop=True)
                log.append(f"Dropped {before - len(df)} rows with missing '{col}'")
        else:
            if strategy in ("auto", "mode"):
                mode_vals = df[col].mode()
                val = str(mode_vals.iloc[0]) if not mode_vals.empty else "Unknown"
                df[col] = df[col].fillna(val)
                log.append(f"Filled '{col}' missing values with mode ('{val}')")

            elif strategy == "drop":
                before = len(df)
                df = df.dropna(subset=[col]).reset_index(drop=True)
                log.append(f"Dropped {before - len(df)} rows with missing '{col}'")

    # ── Remove duplicates ──────────────────────────────────────────────────
    if remove_duplicates:
        before = len(df)
        df = df.drop_duplicates().reset_index(drop=True)
        removed = before - len(df)
        if removed > 0:
            log.append(f"Removed {removed} duplicate rows")

    # ── Handle outliers ────────────────────────────────────────────────────
    if handle_outliers:
        # refresh numeric cols after potential row drops
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) < 4:
                continue

            if outlier_method == "iqr":
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                if iqr == 0:
                    continue
                lb, ub = q1 - 1.5 * iqr, q3 + 1.5 * iqr

            elif outlier_method == "zscore":
                mean, std = series.mean(), series.std()
                if std == 0:
                    continue
                lb, ub = mean - 3 * std, mean + 3 * std
            else:
                continue

            outlier_count = int(((df[col] < lb) | (df[col] > ub)).sum())
            if outlier_count > 0:
                df[col] = df[col].clip(lower=lb, upper=ub)
                log.append(
                    f"Clipped {outlier_count} outliers in '{col}' "
                    f"using {'IQR' if outlier_method == 'iqr' else 'Z-Score'} "
                    f"[{lb:.4f}, {ub:.4f}]"
                )

    df = df.reset_index(drop=True)
    log.append(f"Cleaning complete. Final dataset: {len(df)} rows × {len(df.columns)} columns")
    return df, log
